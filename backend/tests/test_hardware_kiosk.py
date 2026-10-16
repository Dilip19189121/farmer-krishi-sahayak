# test_hardware_kiosk.py — pytest for the Krishi Sahayak kiosk state machine.
#
# All hardware is faked: mic capture (_record_clip stub), TTS playback
# (_speak / _speak_segments stubs) and the backend endpoints (/presence/*,
# /chat/voice via httpx.MockTransport). No GPIO, no camera, no speaker, no
# network — the laptop-mode requirement is exercised by construction: the
# whole suite runs on a plain laptop.
#
# Timing is deterministic: patches make every gap 0 s, and tests assert on
# recorder/spy evidence (spoken text, session begin/end) rather than
# sampling volatile machine state mid-flight.
#
# Run:  .venv/Scripts/python -m pytest tests/test_hardware_kiosk.py -v

import asyncio
import contextlib
import sys
import time
from pathlib import Path

import httpx
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.services import multilang  # noqa: E402
from app.services.hardware import state_machine as sm  # noqa: E402
from app.services.hardware.state_machine import (  # noqa: E402
    FOLLOWUP_PROMPTS,
    FOLLOWUP_SILENT_PROMPTS,
    LANGUAGE_CHOICE_SEGMENTS,
    REPEAT_PROMPTS,
    SWITCH_ACKS,
    TIMEOUT_WARNING_PROMPTS,
    WELCOME_RETRY_SEGMENTS,
    WELCOME_SEGMENTS,
)


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------

class MicSequence:
    """`_record_clip` stub: pops scripted modes, then reports silence."""

    def __init__(self, steps, speech_delay=0.0, no_speech_delay=0.0):
        self.steps = list(steps)
        self.speech_delay = speech_delay
        self.no_speech_delay = no_speech_delay
        self.calls = 0

    def __call__(self, max_seconds):
        mode = self.steps.pop(0) if self.steps else "no_speech"
        delay = {
            "speech": self.speech_delay,
            "no_speech": self.no_speech_delay,
        }.get(mode, 0.0)
        if delay:
            time.sleep(delay)
        self.calls += 1
        if mode == "no_speech":
            return (b"", 16000, {"ended_by": "no speech detected",
                                 "speech_seconds": 0.0})
        return (b"RIFFfake", 16000, {"ended_by": "silence",
                                     "speech_seconds": 1.2})


class TtsRecorder:
    """`_speak` / `_speak_segments` stub: records (text, lang, interrupted)
    and can force interruptions on any call via the schedule."""

    def __init__(self, session_begins=None, session_ends=None,
                 end_times=None):
        self.calls = []      # (text, lang, interrupted)
        self.schedule = []   # pop one bool per _speak: True forces a cut
        self.session_begins = session_begins  # list[float] monotonic stamps
        self.session_ends = session_ends      # list[str] end reasons
        self.end_times = end_times            # matching monotonic stamps

    def interrupt_on(self, which_speak):
        """`which_speak` uninterrupted calls followed by one interruption."""
        self.schedule.extend([False] * which_speak + [True])

    async def _next_interrupt(self):
        if self.schedule:
            if self.schedule.pop(0):
                sm._INTERRUPT_FLAG.set()
                return True
        sm._INTERRUPT_FLAG.clear()
        return False

    async def speak(self, text, lang="en", interruptible=True):
        interrupted = await self._next_interrupt()
        self.calls.append((text, lang, interrupted))
        return interrupted

    async def speak_segments(self, segments, interruptible=True):
        for text, lang in segments:
            if await self.speak(text, lang, interruptible):
                break
            if sm._INTERRUPT_FLAG.is_set():
                break
        return sm._INTERRUPT_FLAG.is_set()

    def texts(self):
        return [c[0] for c in self.calls]

    def langs_for(self, substring):
        return [c[1] for c in self.calls if substring in c[0]]

    def spoken(self, text):
        return [c[1] for c in self.calls if c[0] == text]


class FakeBackend:
    """httpx.MockTransport handler: the /presence/* and /chat/voice surface."""

    def __init__(self, voice=None, present=True):
        self.voice = list(voice or [])
        self.present = present
        self.on_voice = None       # sync hook run when POST /chat/voice lands
        self.voice_calls = 0
        self.start_calls = 0
        self.stop_calls = 0

    def handler(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path == "/presence/start":
            self.start_calls += 1
            return httpx.Response(200, json={"status": "watcher running"})
        if path == "/presence/status":
            return httpx.Response(200, json={
                "status": "watcher running",
                "faces": 1 if self.present else 0,
                "streak": 9 if self.present else 0,
                "present": self.present,
            })
        if path == "/presence/stop":
            self.stop_calls += 1
            return httpx.Response(200, json={"status": "stopped"})
        if path == "/chat/voice":
            self.voice_calls += 1
            if self.on_voice is not None:
                self.on_voice()
            body = (self.voice.pop(0) if self.voice else
                    {"transcribed_text": "", "answer": "",
                     "provider": "mock", "cached": False,
                     "detected_language": "en"})
            for key, default in (("transcribed_text", ""), ("answer", ""),
                                 ("provider", "mock"),
                                 ("detected_language", "en")):
                body.setdefault(key, default)
            return httpx.Response(200, json=body)
        return httpx.Response(404, json={"detail": f"unexpected {path}"})


def turn(transcript, answer, lang):
    return {"transcribed_text": transcript, "answer": answer,
            "provider": "groq", "cached": False, "detected_language": lang}


TE_Q = "మా పంటకు ఏ పురుగు మందు వాడాలి?"
TE_A = "పురుగు మందుగా నీలి ఆకు వాడండి ధాన్యం పొలంలో చలి సమయం"
EN_Q = "What is the current price of tomato crop?"
EN_A = "Tomato price today comes from the mandi listings."


# ---------------------------------------------------------------------------
# Fixtures / drivers
# ---------------------------------------------------------------------------

@pytest.fixture
def kiosk_env(monkeypatch):
    """Patch every slow/hardware path with fakes; return the recorder."""
    # last_reason is overwritten by the next IDLE enter milliseconds after a
    # session ends, so capture begin/end stamps at the exact moment they set.
    session_ends = []
    end_times = []
    session_begins = []
    orig_end = sm.KioskStateMachine._end_session
    orig_begin = sm.KioskStateMachine._begin_session

    async def _spy_end_session(self, reason):
        session_ends.append(reason)
        end_times.append(time.monotonic())
        await orig_end(self, reason)

    def _spy_begin_session(self):
        session_begins.append(time.monotonic())
        orig_begin(self)

    monkeypatch.setattr(sm.KioskStateMachine, "_end_session", _spy_end_session)
    monkeypatch.setattr(sm.KioskStateMachine, "_begin_session",
                        _spy_begin_session)

    recorder = TtsRecorder(session_begins, session_ends, end_times)
    monkeypatch.setattr(sm, "_speak", recorder.speak)
    monkeypatch.setattr(sm, "_speak_segments", recorder.speak_segments)
    monkeypatch.setattr(sm, "_sd_stop_all", lambda: None)
    monkeypatch.setattr(sm, "LISTEN_BREAK_SECONDS", 0.0)
    monkeypatch.setattr(sm, "WELCOME_RETRY_DELAY_SECONDS", 0.0)
    monkeypatch.setattr(sm, "CHECKING_POLL_SECONDS", 0.02)
    monkeypatch.setattr(sm, "SPEAK_TIMEOUT_SECONDS", 5.0)
    sm._INTERRUPT_FLAG.clear()
    sm._WATCHER_STOP.set()
    return recorder


def make_machine(backend):
    m = sm.KioskStateMachine(api_base="http://mock")
    m._transport = httpx.MockTransport(backend.handler)
    return m


async def _wait_until(pred, note="", timeout=20.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if pred():
            return
        await asyncio.sleep(0.02)
    raise AssertionError(f"timed out waiting for {note or pred!r}")


@contextlib.asynccontextmanager
async def driven_session(machine, recorder, force=True):
    """Start the loop and trigger one session.

    An instant session may begin AND end between two 20 ms polls, so the
    "started" wait accepts either evidence of activity (session running or
    already ended). On exit the session is guaranteed finished.
    """
    assert machine.start()
    try:
        await asyncio.sleep(0.05)
        machine.request_trigger(force=force)
        await _wait_until(
            lambda: machine._session_started_at is not None
            or recorder.session_ends,
            note="session activity")
        yield machine
        await _wait_until(lambda: not machine._session_started_at,
                          note="session end")
        assert machine.state == sm.State.IDLE
        assert machine.last_error is None, machine.last_error
    finally:
        sm._INTERRUPT_FLAG.clear()
        sm._WATCHER_STOP.set()
        if machine._task is not None:
            machine._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await machine._task


# ---------------------------------------------------------------------------
# multilang units (Task 1)
# ---------------------------------------------------------------------------

def test_preferred_language_mixed_te_en_prefers_telugu():
    # Mixed Telugu+English in one sentence -> Telugu, whichever script wins.
    assert multilang.preferred_language("మా పంటకు tomato market ధర ఎంత?")[0] \
        == "te"
    assert multilang.preferred_language("tomato price ఎంత ఉంది ok")[0] == "te"
    # Pure languages stay themselves.
    assert multilang.preferred_language("What is the tomato price?")[0] == "en"
    assert multilang.preferred_language("पीएम किसान योजना क्या है?")[0] == "hi"


def test_detect_language_script_counts():
    assert multilang.detect_language(TE_Q)[0] == "te"
    assert multilang.detect_language("What is PM Kisan eligibility")[0] == "en"
    assert multilang.detect_language("पीएम किसान योजना क्या है?")[0] == "hi"
    # Nothing detectable in whitespace: falls back to English.
    assert multilang.detect_language("   ")[0] == "en"


def test_explicit_language_switch_keywords():
    assert multilang.explicit_language_switch("speak in telugu please") == "te"
    assert multilang.explicit_language_switch("telugu lo cheppu") == "te"
    assert multilang.explicit_language_switch("हिंदी में बताइए") == "hi"
    assert multilang.explicit_language_switch("switch to english") == "en"
    assert multilang.explicit_language_switch(TE_Q) is None
    assert multilang.explicit_language_switch(EN_Q) is None
    assert multilang.explicit_language_switch("") is None


def test_voice_chat_response_contract_detected_language(monkeypatch):
    """/chat/voice responses must carry transcribed_text + detected_language."""
    sys.path.insert(0, str(BACKEND_DIR))
    from app.routes.chat import VoiceChatResponse
    from pydantic import ValidationError

    body = VoiceChatResponse(answer="a", provider="groq", sources=[],
                             transcribed_text="q", detected_language="te")
    assert body.detected_language == "te"
    assert body.transcribed_text == "q"
    with pytest.raises(ValidationError):
        # detected_language is required on every voice response.
        VoiceChatResponse(answer="a", provider="x", sources=[],
                          transcribed_text="q")


# ---------------------------------------------------------------------------
# Language consistency across turns (Task 1)
# ---------------------------------------------------------------------------

def test_language_locks_and_never_switches_mid_session(kiosk_env,
                                                       monkeypatch):
    """The first clear transcript locks the session language; a later turn
    reported as English must STILL be spoken in the locked language."""
    backend = FakeBackend(voice=[
        turn(TE_Q, TE_A, "te"),
        turn(EN_Q, EN_A, "en"),     # /chat/voice reports English here
    ])
    monkeypatch.setattr(sm, "_record_clip", MicSequence(["speech", "speech"]))
    kiosk_env.interrupt_on(1)   # cut the welcome at the te segment

    async def scenario():
        m = make_machine(backend)
        async with driven_session(m, kiosk_env):
            pass
        # Answer 1 (Telugu report) and answer 2 (English report) both Telugu.
        assert kiosk_env.langs_for(TE_A) == ["te"]
        assert kiosk_env.langs_for(EN_A) == ["te"]
        # No switch happened: no switch ack spoken, ends clean.
        assert kiosk_env.spoken(SWITCH_ACKS["hi"]) == []
        assert kiosk_env.session_ends, kiosk_env.session_ends

    asyncio.run(scenario())


def test_explicit_switch_changes_session_language(kiosk_env, monkeypatch):
    """'हिंदी में बताइए' mid-session flips the lock, with a Hindi ack, and
    subsequent English-reported answers are spoken in Hindi."""
    backend = FakeBackend(voice=[
        turn(TE_Q, TE_A, "te"),
        {"transcribed_text": "हिंदी में बताइए", "answer": "",
         "provider": "groq", "detected_language": "hi"},
        turn(EN_Q, EN_A, "en"),
    ])
    monkeypatch.setattr(
        sm, "_record_clip", MicSequence(["speech", "speech", "speech"]))
    kiosk_env.interrupt_on(1)   # cut the welcome at the te segment

    async def scenario():
        m = make_machine(backend)
        async with driven_session(m, kiosk_env):
            pass
        assert kiosk_env.spoken(SWITCH_ACKS["hi"]) == ["hi"]
        assert kiosk_env.langs_for(EN_A) == ["hi"]  # answers stay Hindi
        assert len(kiosk_env.session_ends) == 1

    asyncio.run(scenario())


def test_undetectable_speech_prompts_selection_then_defaults_telugu(
        kiosk_env, monkeypatch):
    backend = FakeBackend(voice=[turn("hmm ah", "", "en")])  # filler junk
    monkeypatch.setattr(sm, "_record_clip", MicSequence(["speech"]))
    monkeypatch.setattr(sm, "LANG_TIMEOUT_SECONDS", 0.05)
    kiosk_env.interrupt_on(1)   # cut the welcome at the te segment

    async def scenario():
        m = make_machine(backend)
        async with driven_session(m, kiosk_env):
            pass
        # The trilingual selection prompt was spoken...
        for seg_text, _seg_lang in LANGUAGE_CHOICE_SEGMENTS:
            assert seg_text in kiosk_env.texts()
        # ...the farmer stayed quiet through the pick window (LANG_TIMEOUT),
        # and the repeat prompt right after uses the DEFAULTED Telugu.
        assert kiosk_env.spoken(REPEAT_PROMPTS["te"]) == ["te"]
        assert len(kiosk_env.session_ends) == 1

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Interruption (Task 2)
# ---------------------------------------------------------------------------

def test_welcome_interrupted_goes_straight_to_listening(kiosk_env,
                                                        monkeypatch):
    """Speech over the welcome playback stops it (rest of segments dropped)
    and the kiosk enters LISTENING without any retry welcome."""
    backend = FakeBackend()
    monkeypatch.setattr(sm, "_record_clip", MicSequence([]))
    kiosk_env.interrupt_on(1)   # cut during the 2nd welcome segment

    async def scenario():
        m = make_machine(backend)
        async with driven_session(m, kiosk_env):
            pass
        texts = kiosk_env.texts()
        assert texts[0] == WELCOME_SEGMENTS[0][0]           # "Welcome!"
        assert WELCOME_SEGMENTS[1][0] in texts              # "Namaskaram!"
        assert WELCOME_SEGMENTS[2][0] not in texts          # hi segment cut
        assert WELCOME_RETRY_SEGMENTS[0][0] not in texts     # never retried

    asyncio.run(scenario())


def test_answer_interrupted_skips_followup(kiosk_env, monkeypatch):
    """Speech over an ANSWER cuts it and goes straight back to LISTENING:
    the follow-up prompt is skipped."""
    backend = FakeBackend(voice=[turn(TE_Q, TE_A, "te"),
                                 turn(TE_Q, TE_A + " two", "te")])
    monkeypatch.setattr(sm, "_record_clip", MicSequence(["speech",
                                                         "speech"]))
    kiosk_env.interrupt_on(1)      # welcome cut at segment 2
    # ...and the (single) first answer is cut mid-way: the welcome already
    # consumed the [False, True] pair, so only the interruption remains.
    kiosk_env.schedule.extend([True])

    async def scenario():
        m = make_machine(backend)
        async with driven_session(m, kiosk_env):
            pass
        texts = kiosk_env.texts()
        first_answer_pos = next(i for i, t in enumerate(texts)
                                if TE_A in t)
        assert kiosk_env.calls[first_answer_pos][2] is True   # it was cut
        second_answer_pos = next(i for i, t in enumerate(texts)
                                 if " two" in t)
        between = texts[first_answer_pos + 1:second_answer_pos]
        assert FOLLOWUP_PROMPTS["te"] not in between          # no follow-up

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Welcome & conversation flow (Task 3)
# ---------------------------------------------------------------------------

def test_welcome_repeats_then_session_ends(kiosk_env, monkeypatch):
    """Nobody answers: welcome repeats up to WELCOME_RETRIES times (delay
    patched to 0) and the session then ends cleanly."""
    monkeypatch.setattr(sm, "WELCOME_RETRIES", 2)
    backend = FakeBackend()
    monkeypatch.setattr(sm, "_record_clip", MicSequence([]))

    async def scenario():
        m = make_machine(backend)
        async with driven_session(m, kiosk_env):
            pass
        rounds = 1 + 2  # initial + retries
        expected = ([t for t, _l in WELCOME_SEGMENTS]
                    + [t for t, _l in WELCOME_RETRY_SEGMENTS] * (rounds - 1))
        assert kiosk_env.texts() == expected
        assert kiosk_env.session_ends == ["no response to repeated welcomes"]

    asyncio.run(scenario())


def test_two_silent_turns_followup_then_end(kiosk_env, monkeypatch):
    """During conversation: 1 silent turn -> repeat prompt; 2 -> follow-up
    prompt + one last listen; still silent -> session ends."""
    backend = FakeBackend(voice=[turn(TE_Q, TE_A, "te")])
    monkeypatch.setattr(sm, "_record_clip", MicSequence(["speech"]))
    kiosk_env.interrupt_on(1)   # welcome cut at segment 2

    async def scenario():
        m = make_machine(backend)
        async with driven_session(m, kiosk_env):
            pass
        texts = kiosk_env.texts()
        assert REPEAT_PROMPTS["te"] in texts            # after silent turn 1
        assert FOLLOWUP_SILENT_PROMPTS["te"] in texts   # after silent turn 2
        assert kiosk_env.session_ends == [
            "ended after follow-up prompt (still silent)"]

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Session timer / status surface (Task 4)
# ---------------------------------------------------------------------------

def test_status_session_fields_countdown_and_cleanup(kiosk_env, monkeypatch):
    monkeypatch.setattr(sm, "SESSION_TIMEOUT_MINUTES", 0.5)  # 30 s session
    backend = FakeBackend()
    # 3 slow silent turns keep the session alive long enough to sample twice.
    monkeypatch.setattr(sm, "_record_clip",
                        MicSequence([], no_speech_delay=0.4))
    kiosk_env.interrupt_on(2)   # full welcome plays, then is cut

    async def scenario():
        m = make_machine(backend)
        assert m.start()
        try:
            await asyncio.sleep(0.05)
            m.request_trigger(force=True)
            await _wait_until(lambda: m._session_started_at is not None,
                              note="session begins (slow silence turns)")
            status = m.status()
            assert status["session_state"] in ("GREETING", "LISTENING",
                                               "RESPONDING")
            assert status["detected_language"] is None  # nothing said yet
            assert status["session_start"] is not None
            remaining = status["remaining_seconds"]
            assert 0 < remaining <= 30.5, remaining
            import datetime as dt
            dt.datetime.fromisoformat(status["session_start"])  # parseable
            time.sleep(1.2)  # countdown ticks down (>= 1s beyond rounding)
            assert m.status()["remaining_seconds"] < remaining

            await _wait_until(lambda: m._session_started_at is None,
                              note="session end")
            after = m.status()
            assert after["session_state"] == "inactive"
            assert after["session_start"] is None
            assert after["remaining_seconds"] is None
        finally:
            sm._INTERRUPT_FLAG.clear()
            sm._WATCHER_STOP.set()
            if m._task is not None:
                m._task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await m._task

    asyncio.run(scenario())


def test_one_minute_warning_spoken_once_in_locked_language(kiosk_env,
                                                           monkeypatch):
    backend = FakeBackend(voice=[turn(TE_Q, TE_A, "te"),
                                 turn(EN_Q, EN_A, "en")])
    monkeypatch.setattr(sm, "_record_clip", MicSequence(["speech",
                                                         "speech"]))
    kiosk_env.interrupt_on(1)   # welcome cut at segment 2

    async def scenario():
        m = make_machine(backend)

        def on_voice():
            # When the SECOND turn (after Telugu is locked) lands, shrink
            # the remaining session time into the 1-minute warning window.
            if backend.voice_calls == 2:
                m._session_deadline = time.monotonic() + 30.0

        backend.on_voice = on_voice
        async with driven_session(m, kiosk_env):
            pass
        warns = kiosk_env.spoken(TIMEOUT_WARNING_PROMPTS["te"])
        assert len(warns) == 1, kiosk_env.calls
        assert warns == ["te"]      # warning spoke the locked language

    asyncio.run(scenario())


def test_timeout_waits_for_answer_then_ends(kiosk_env, monkeypatch):
    """A deadline crossing DURING an answer must not cut the farmer off:
    the turn finishes, then the session ends with the outro."""
    seen = {}
    backend = FakeBackend(voice=[turn(TE_Q, TE_A, "te")])
    monkeypatch.setattr(sm, "_record_clip", MicSequence(["speech"]))
    kiosk_env.interrupt_on(1)   # welcome cut at segment 2

    async def scenario():
        m = make_machine(backend)

        def during_answer():
            # First /chat/voice call: the turn IS in progress here. Expire
            # the deadline NOW; the machine may only end it after the turn.
            if "turn_in_progress" not in seen:
                seen["turn_in_progress"] = m._turn_in_progress
                m._session_deadline = time.monotonic() - 0.01

        backend.on_voice = during_answer
        async with driven_session(m, kiosk_env):
            pass
        assert seen.get("turn_in_progress") is True
        assert m.turns_answered == 1                # the turn still finished
        assert kiosk_env.session_ends == ["session timeout"], \
            kiosk_env.session_ends
        assert kiosk_env.langs_for(TE_A) == ["te"]  # answer was spoken
        assert kiosk_env.spoken(FOLLOWUP_SILENT_PROMPTS["te"])  # outro

    asyncio.run(scenario())


def test_grace_period_bounds(monkeypatch):
    """Timeout with a Q/A in progress: inside GRACE it may finish, beyond
    GRACE it is cut off (unit level; the loop never reaches this mid-turn)."""
    monkeypatch.setattr(sm, "GRACE_PERIOD_SECONDS", 5.0)

    async def scenario():
        m = sm.KioskStateMachine(api_base="http://mock")
        m._begin_session()
        now = time.monotonic()
        m._session_deadline = now - 1.0
        m._turn_in_progress = True
        assert await m._deadline_passing_checks() is False  # still in grace
        m._session_deadline = now - 6.0                    # beyond grace
        assert await m._deadline_passing_checks() is True
        assert m.last_reason == "grace period expired during turn"

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Presence / absence (Task 5)
# ---------------------------------------------------------------------------

def test_absence_grace_unit_present_brief_and_expired(monkeypatch):
    """Registered absence only turns into an end after
    ABSENCE_GRACE_SECONDS CONTINUOUS, with no recent speech and no turn
    in progress."""
    monkeypatch.setattr(sm, "ABSENCE_GRACE_SECONDS", 10.0)

    async def scenario():
        backend = FakeBackend(present=True)
        m = make_machine(backend)
        m._begin_session()
        assert await m._absence_ended() is False    # present: all good
        assert m._absent_since is None
        backend.present = False
        assert await m._absence_ended() is False    # grace started, alive
        assert m._absent_since is not None
        assert await m._absence_ended() is False    # still inside grace
        backend.present = True
        assert await m._absence_ended() is False    # farmer is back
        assert m._absent_since is None              # timer reset
        backend.present = False
        assert await m._absence_ended() is False
        m._absent_since = time.monotonic() - 11.0   # longer than 10 s grace
        m._last_speech_at = time.monotonic()        # ...but farmer JUST spoke
        assert await m._absence_ended() is False    # speech keeps it alive
        m._last_speech_at = time.monotonic() - 30.0
        assert await m._absence_ended() is True     # gone for real
        assert m.last_reason == "farmer absent beyond grace period"

    asyncio.run(scenario())


def test_absence_e2e_ends_session_after_grace(kiosk_env, monkeypatch):
    monkeypatch.setattr(sm, "ABSENCE_GRACE_SECONDS", 0.3)
    backend = FakeBackend(present=False, voice=[turn(TE_Q, TE_A, "te")])
    monkeypatch.setattr(sm, "_record_clip",
                        MicSequence(["speech"], no_speech_delay=0.4))
    kiosk_env.interrupt_on(1)   # welcome cut at segment 2

    async def scenario():
        m = make_machine(backend)
        async with driven_session(m, kiosk_env):
            pass
        assert kiosk_env.session_ends == [
            "farmer absent beyond grace period"], kiosk_env.session_ends

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# Cooldown (Task 5)
# ---------------------------------------------------------------------------

def test_cooldown_after_end_and_fresh_boot_no_wait(kiosk_env, monkeypatch):
    monkeypatch.setattr(sm, "COOLDOWN_SECONDS", 1.0)
    monkeypatch.setattr(sm, "WELCOME_RETRIES", 1)
    backend = FakeBackend()
    monkeypatch.setattr(sm, "_record_clip", MicSequence([]))

    async def scenario():
        m = make_machine(backend)
        assert m.start()
        try:
            await asyncio.sleep(0.05)
            m.request_trigger(force=True)   # session 1 ends by exhaustion
            await _wait_until(lambda: kiosk_env.session_ends, note="end 1")
            assert len(kiosk_env.session_ends) == 1
            end1 = kiosk_env.end_times[0]
            # An immediate second trigger must WAIT out the cooldown.
            m.request_trigger(force=True)
            await _wait_until(lambda: len(kiosk_env.session_begins) == 2,
                              note="session 2 began")
            # Session 2 could only start >= COOLDOWN after session 1 ended.
            assert (kiosk_env.session_begins[1]
                    - end1) >= 0.9, kiosk_env.session_begins
            await _wait_until(lambda: len(kiosk_env.session_ends) == 2,
                              note="session 2 ended")
        finally:
            sm._INTERRUPT_FLAG.clear()
            sm._WATCHER_STOP.set()
            if m._task is not None:
                m._task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await m._task

    asyncio.run(scenario())

    # A brand-new machine NEVER waits: the first trigger after boot is fast.
    fresh = sm.KioskStateMachine(api_base="http://mock")
    assert fresh.status()["cooldown_left"] == 0.0


# ---------------------------------------------------------------------------
# Laptop mode (Task 5: hardware stays optional)
# ---------------------------------------------------------------------------

def test_laptop_mode_no_gpio_full_session(kiosk_env, monkeypatch):
    if sm.GPIO_AVAILABLE:
        pytest.skip("RPi.GPIO present on this box; laptop-mode cannot be "
                    "exercised here")
    monkeypatch.setattr(sm, "WELCOME_RETRIES", 0)
    backend = FakeBackend()
    monkeypatch.setattr(sm, "_record_clip", MicSequence([]))

    async def scenario():
        m = make_machine(backend)
        status = m.status()
        assert status["gpio_available"] is False
        assert status["trig_pin"] is None and status["echo_pin"] is None
        async with driven_session(m, kiosk_env):
            pass  # welcome exhaustion with zero hardware anywhere
        assert kiosk_env.session_ends == ["no response to repeated welcomes"]
        assert backend.stop_calls == 1   # camera off at session end

    asyncio.run(scenario())
