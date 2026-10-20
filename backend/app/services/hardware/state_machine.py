# state_machine.py — Krishi Sahayak kiosk hardware state machine (Stage H+).
#
# Drives the physical kiosk loop with asyncio:
#   IDLE → CHECKING → GREETING → LISTENING → RESPONDING → LISTENING ... → END
#   → IDLE.
#
#   IDLE       wait for a trigger (ultrasonic sensor edge, or manual POST
#              /hardware/trigger), then honor the post-session cooldown.
#   CHECKING   call the EXISTING POST /presence/start, poll GET
#              /presence/status for CHECKING_STATUS_FRAMES frames, confirm a
#              human is standing there. Not confirmed → camera off
#              (POST /presence/stop) → IDLE.
#   GREETING   the multilingual welcome ("Welcome! Namaskaram! Namaste!"),
#              repeated up to WELCOME_RETRIES times when nobody responds
#              (WELCOME_RETRY_DELAY_SECONDS apart), then LISTENING.
#   LISTENING  record the mic (speech_io, silence-stopped, LISTEN_CAP_SECONDS
#              cap) and POST to the EXISTING /chat/voice endpoint.
#              The farmer's language is detected ONCE ("te" for mixed
#              Telugu+English) and locked for the whole session — it never
#              switches mid-session unless farmer says so explicitly.
#              Undetectable speech → a trilingual language-selection prompt,
#              LANG_TIMEOUT_SECONDS to answer, otherwise Telugu.
#   RESPONDING speak the answer + a short "anything else?" follow-up prompt
#              through TTS in the locked language, then → LISTENING.
#              TWO consecutive silent turns → one follow-up prompt → one last
#              listening window → END.
#              INTERRUPTION: while ANY TTS plays, a mic watcher listens; the
#              farmer's voice stops the playback instantly and the kiosk goes
#              straight back to LISTENING (no overlapping audio: playback
#              stops before anything new is spoken).
#   END        expiry conditions: session timer over (SESSION_TIMEOUT_MINUTES,
#              with the 1-minute warning spoken; a turn in progress at
#              timeout is allowed to finish within GRACE_PERIOD_SECONDS),
#              absence (no face) for ABSENCE_GRACE_SECONDS with no speech
#              activity, or 3 no-response timeouts. Session end → camera off,
#              TTS stopped, session state cleared → IDLE.
#
# Session state (all cleared on end):
#   - locked language, unique per-session chat session_id (so /chat/voice's
#     existing conversation memory keeps context across turns),
#   - deadline/warning state, welcome retries, silent-turn counting,
#   - presence-absence timestamp.
#
# Hardware is fully OPTIONAL:
#   - No RPi.GPIO on this box → one warning, the sensor watcher is skipped,
#     and the loop is still drivable manually via POST /hardware/trigger
#     (routes/hardware.py). The sensor's OUT pin is just an ALTERNATIVE way
#     to set the same trigger the endpoint sets.
#   - No camera → CHECKING simply never confirms; the kiosk parks in IDLE.
#   - No mic/speaker → turns are recorded empty / silent, counted as
#     no-response, and the machine returns to IDLE after its retries.
#
# The existing backend stays untouched apart from additive fields documented
# in docs/api_contract.md: this module only calls /presence/* and /chat/voice.
#
# Local smoke: python -m app.services.hardware.state_machine

import asyncio
import datetime as _dt
import enum
import io
import os
import sys
import threading
import time
from pathlib import Path

import httpx

from app.services import multilang


# Whole-process chat log surfaced to the frontend: [{role, text}, ...] — the
# full Q&A history of the kiosk. Cleared on demand by GET
# /hardware/chat-log (routes/hardware.py).
frontend_chat_log: list[dict] = []


# state_machine.py -> hardware/ -> services/ -> app/ -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(BACKEND_DIR))

# ---- configuration (all env-overridable; defaults documented) --------------
API_BASE = os.getenv("HARDWARE_API_BASE", "http://127.0.0.1:8000")
SESSION_ID_BASE = os.getenv("HARDWARE_SESSION_ID", "hardware-kiosk")
CAMERA_INDEX = int(os.getenv("HARDWARE_CAMERA_INDEX", "0"))

# Ultrasonic sensor: the sensor's digital OUT line wired to this BCM pin
# produces a rising edge on approach (HC-SR04 via a comparator/trigger board
# ships exactly that). Pure HC-SR04 raw TRIG/ECHO wiring needs the ping
# protocol — see _gpio_distance_cm() below for the two-pin option.
ULTRASONIC_TRIG_PIN = os.getenv("HARDWARE_TRIG_PIN")  # e.g. "17" (BCM)
ULTRASONIC_ECHO_PIN = os.getenv("HARDWARE_ECHO_PIN")  # optional raw-wiring pin

CHECKING_STATUS_FRAMES = 5     # /presence/status polls before confirming
CHECKING_POLL_SECONDS = 0.5    # per-poll gap; matches the 10 fps watcher
SPEAK_TIMEOUT_SECONDS = 30.0   # hard cap on one cloud TTS synthesis
LISTEN_BREAK_SECONDS = 0.5     # settle gap between the TTS and the mic

# No-response TIMEOUT for one turn: nobody spoke after this many seconds of
# mic, so a resting kiosk never sits through the full 60s voice-upload cap.
LISTEN_CAP_SECONDS = float(os.getenv("HARDWARE_LISTEN_SECONDS", "20"))

LANG_TIMEOUT_SECONDS = float(
    os.getenv("LANG_TIMEOUT_SECONDS", "8")
)  # wait for the farmer to pick a language, else default Telugu
WELCOME_RETRIES = int(os.getenv("WELCOME_RETRIES", "3"))
WELCOME_RETRY_DELAY_SECONDS = float(
    os.getenv("WELCOME_RETRY_DELAY_SECONDS", "6")
)  # gap between repeated welcomes
SESSION_TIMEOUT_MINUTES = float(
    os.getenv("SESSION_TIMEOUT_MINUTES", "10")
)  # total kiosk session length
GRACE_PERIOD_SECONDS = float(
    os.getenv("GRACE_PERIOD_SECONDS", "120")
)  # extra time to finish a Q/A already in progress at timeout
ABSENCE_GRACE_SECONDS = float(
    os.getenv("ABSENCE_GRACE_SECONDS", "60")
)  # end the session only after this much CONTINUOUS absence
COOLDOWN_SECONDS = float(
    os.getenv("COOLDOWN_SECONDS", "10")
)  # IDLE dwell; sensor fluctuations during it are ignored

# Interruption: mic RMS >= the threshold for this many 100 ms blocks while TTS
# plays → stop the playback and listen. Chosen above the speaker-to-mic echo
# level so the kiosk cannot interrupt itself; tune per acoustic install.
INTERRUPTION_RMS_THRESHOLD = float(os.getenv("INTERRUPTION_RMS_THRESHOLD", "0.04"))
INTERRUPTION_LOUD_BLOCKS = int(os.getenv("INTERRUPTION_LOUD_BLOCKS", "3"))


# ---- logging (same [tag] style as the rest of the app) ---------------------

def _log(msg: str) -> None:
    print(f"[hardware] {msg}")


def _log_task_crash(task: "asyncio.Task") -> None:
    if task.cancelled():
        _log("state machine loop CANCELLED")
        return
    exc = task.exception()
    if exc is not None:
        _log(f"state machine loop CRASHED: {type(exc).__name__}: {exc}")
        import traceback

        traceback.print_exc()


# ---- state -----------------------------------------------------------------

class State(str, enum.Enum):
    IDLE = "IDLE"
    CHECKING = "CHECKING"
    GREETING = "GREETING"
    LISTENING = "LISTENING"
    RESPONDING = "RESPONDING"
    END = "END"


# edge-tts neural voices, same choices as app/services/answer_speaker.py.
VOICE_BY_LANG = {
    "te": "te-IN-ShrutiNeural",
    "hi": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
}

# The multilingual welcome: spoken segment-by-segment with the matching
# neural voice so each word sounds native. Used while the farmer's language
# is not yet detected (every new session starts here).
WELCOME_SEGMENTS = (
    ("Welcome!", "en"),
    ("Namaskaram! Please ask your question.", "te"),
    ("Namaste! अपना सवाल बताइए।", "hi"),
)
# Shorter repeat when nobody answered the first welcome.
WELCOME_RETRY_SEGMENTS = (
    ("Hello? Please ask your question.", "en"),
    ("మీ ప్రశ్న చెప్పండి.", "te"),
    ("अपना सवाल बताइए।", "hi"),
)

REPEAT_PROMPTS = {
    "te": "క్షమించండి, నాకు వినిపించలేదు. దయచేసి మళ్ళీ చెప్పండి.",
    "hi": "क्षमा करें, मुझे समझ नहीं आया। कृपया दोबारा बताइए।",
    "en": "Sorry, I could not hear that clearly. Please say it again.",
}
FOLLOWUP_PROMPTS = {
    "te": "మరేమైనా సహాయం కావాలా?",
    "hi": "कोई और मदद चाहिए?",
    "en": "Anything else I can help you with?",
}
FOLLOWUP_SILENT_PROMPTS = {
    "te": "సరే, మీ సమయం తీసుకున్నాను. మరిన్ని ప్రశ్నల కోసం మళ్ళీ రండి. ధన్యవాదాలు!",
    "hi": "ठीक है, फिर मिलेंगे। और प्रश्नों के लिए दोबारा आइए। धन्यवाद!",
    "en": "Okay, I'll let you go. Come back any time with more questions. Thank you!",
}
TIMEOUT_WARNING_PROMPTS = {
    "te": "మీ సమయం దాదాపు అయిపోతోంది, దయచేసి ఫైనల్ ప్రశ్న అడగండి.",
    "hi": "आपका समय लगभग पूरा हो रहा है, कृपया आख़िरी सवाल पूछें।",
    "en": "Your time is almost up; please ask your final question.",
}
TIMEOUT_OUTRO_PROMPTS = FOLLOWUP_SILENT_PROMPTS
# Trilingual language-selection prompt for undetectable speech.
LANGUAGE_CHOICE_SEGMENTS = (
    ("Which language? Please say Telugu, Hindi or English.", "en"),
    ("మీ భాష? తెలుగు, హిందీ లేదా ఇంగ్లీష్ అని చెప్పండి.", "te"),
    ("आपकी भाषा? तेलुगु, हिंदी या अंग्रेज़ी कहिए।", "hi"),
)
SWITCH_ACKS = {
    "te": "సరే! ఇప్పటి నుంచి తెలుగులో మాట్లాడతాను. మీ ప్రశ్న చెప్పండి.",
    "hi": "ठीक है! अब से हिंदी में बात करूँगा। अपना सवाल बताइए।",
    "en": "Sure! From now on I will speak English. Please tell me your question.",
}

DEFAULT_LANG = "te"  # undetectable speech defaults to Telugu per spec


# ---- optional GPIO (hardware NOT required) ---------------------------------

try:
    import RPi.GPIO as GPIO  # only importable on the Raspberry Pi

    GPIO_AVAILABLE = True
except (ImportError, RuntimeError, AttributeError):
    GPIO = None
    GPIO_AVAILABLE = False
    _log(
        "WARNING: RPi.GPIO not available — ultrasonic sensor trigger is "
        "disabled. Use POST /hardware/trigger to drive the kiosk manually."
    )


# ---- audio playback (async-safe, loop-safe, INTERRUPTIBLE) ------------------

def _play_bytes(audio_bytes: bytes) -> None:
    """Decode mp3/wav bytes and play them fully to the OS default output.
    Blocking; always called through asyncio.to_thread."""
    import sounddevice as sd
    import soundfile as sf

    from scipy.signal import resample_poly

    audio, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    max_rate = 48000
    if sr > max_rate:
        import numpy as np

        g = np.gcd(int(sr), max_rate)
        audio = resample_poly(audio, max_rate // g, int(sr) // g)
        sr = max_rate
    sd.play(audio, samplerate=int(sr))
    sd.wait()


def _play_bytes_interruptible(audio_bytes: bytes) -> bool:
    """Play but cap the playback the instant the farmer speaks.

    Returns True when playback was cut short by an interruption (the mic
    watcher sets _INTERRUPT_FLAG). No overlapping audio: the stream is
    stopped before the caller (LISTENING) starts anything new.
    """
    import sounddevice as sd
    import soundfile as sf

    from scipy.signal import resample_poly

    audio, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    max_rate = 48000
    if sr > max_rate:
        import numpy as np

        g = np.gcd(int(sr), max_rate)
        audio = resample_poly(audio, max_rate // g, int(sr) // g)
        sr = max_rate
    interrupted = False
    sd.play(audio, samplerate=int(sr))
    try:
        while sd.is_playing():
            if _INTERRUPT_FLAG.is_set():
                interrupted = True
                break
            time.sleep(0.08)
    finally:
        if _INTERRUPT_FLAG.is_set():
            sd.stop()
            interrupted = True
        else:
            sd.wait()
    return interrupted


# One instance-wide mic-watcher state (module-level: the watcher thread has
# to signal whatever playback is running; only ONE audio plays at a time).
_INTERRUPT_FLAG = threading.Event()
_WATCHER_STOP = threading.Event()

MIN_SPEECH_SECONDS = 0.4  # RMS burst length that counts as farmer speech


def _watch_mic_for_speech(stop: threading.Event) -> None:
    """While TTS is playing, watch the mic; on farmer speech set the flag.

    Runs in a worker thread (started via asyncio.to_thread). Two streams (the
    mic watcher here + the speaker playback) coexist fine on PortAudio; if
    this device refuses a second stream the kiosk degrades gracefully to
    non-interruptible speech.
    """
    try:
        import numpy as np
        import sounddevice as sd

        block = 1600  # 100 ms blocks at 16 kHz
        loud = 0
        with sd.InputStream(
            samplerate=16000, channels=1, dtype="int16", blocksize=block
        ) as stream:
            while not _INTERRUPT_FLAG.is_set() and not stop.is_set():
                data, _ = stream.read(block)
                audio = np.asarray(data, dtype=np.int16)[:, 0]
                rms = float(
                    np.sqrt(np.mean(audio.astype(np.float64) ** 2))
                ) if audio.size else 0.0
                if rms >= INTERRUPTION_RMS_THRESHOLD:
                    loud += 1
                    if loud >= INTERRUPTION_LOUD_BLOCKS:
                        _INTERRUPT_FLAG.set()
                        return
                else:
                    loud = 0
    except Exception as exc:
        _log(f"interruption mic watcher unavailable ({exc}); speech plays out")


def _record_clip(max_seconds: float) -> tuple[bytes, float, dict]:
    """Mic capture wrapper (kept module-level so tests can stub it)."""
    from app.services import speech_io

    return speech_io.record_clip(max_seconds=max_seconds)


async def _speak(text: str, lang: str = "en", interruptible: bool = True) -> bool:
    """Say `text` aloud (async, in-loop safe). Returns True when interrupted.

    Engine priority mirrors app/services/answer_speaker.py but is loop-safe
    (answer_speaker.speak() uses asyncio.run(), which cannot run inside this
    asyncio task): edge-tts (capped) → gTTS → offline pyttsx3.
    With interruptible=True a mic watcher runs in parallel and cuts the
    playback short the moment the farmer starts talking.
    """
    interrupted = False
    try:
        interrupted = await _speak_edge(text, lang, interruptible=interruptible)
        return interrupted
    except Exception as exc:
        _log(f"TTS edge-tts failed ({type(exc).__name__}: {exc}); next engine")
    try:
        if interruptible:
            await _arm_interruption()
        try:
            await asyncio.to_thread(_play_gtts, text, lang)
        finally:
            _WATCHER_STOP.set()  # never leak an open mic stream
            interrupted = _INTERRUPT_FLAG.is_set()
            if interrupted:
                # Defensive: make sure no audio tail is left playing.
                await asyncio.to_thread(_sd_stop_all)
        return interrupted
    except Exception as exc:
        _log(f"TTS gTTS failed ({type(exc).__name__}: {exc}); offline fallback")
    from app.services import speech_io

    # Offline last resort cannot be interrupted mid-utterance (SAPI5 has no
    # external stop hook here); let it play out and keep the flag's verdict.
    try:
        await asyncio.to_thread(speech_io.speak, text[:1200])
    finally:
        interrupted = _INTERRUPT_FLAG.is_set()
    return interrupted


async def _arm_interruption() -> None:
    """(Re)start the interruption mic watcher for the upcoming playback."""
    _INTERRUPT_FLAG.clear()
    _WATCHER_STOP.clear()
    # Task kept fire-and-forget: it sets the flag when the farmer speaks.
    watcher = asyncio.to_thread(_watch_mic_for_speech, _WATCHER_STOP)
    asyncio.ensure_future(watcher)
    # Give the watcher a beat to open its stream BEFORE playback starts, so
    # speech already in progress is caught with minimal overlap.
    await asyncio.sleep(0.2)
    if _INTERRUPT_FLAG.is_set():
        return  # farmer is already speaking: callers skip playback


def _sd_stop_all() -> None:
    try:
        import sounddevice as sd

        sd.stop()
    except Exception:
        pass


async def _speak_edge(text: str, lang: str, interruptible: bool = True) -> bool:
    buf = io.BytesIO()
    import edge_tts

    voice = VOICE_BY_LANG.get((lang or "en").split("-")[0], VOICE_BY_LANG["en"])
    communicate = edge_tts.Communicate(text, voice=voice)

    async def _stream() -> None:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])

    # edge-tts is a network stream: without a cap a slow/blocked connection
    # would freeze the kiosk in GREETING/RESPONDING forever.
    await asyncio.wait_for(_stream(), timeout=SPEAK_TIMEOUT_SECONDS)
    if buf.tell() == 0:
        raise RuntimeError("edge-tts produced no audio")
    if interruptible:
        interrupted = False
        await _arm_interruption()
        try:
            interrupted = await asyncio.to_thread(
                _play_bytes_interruptible, buf.getvalue()
            )
        finally:
            _WATCHER_STOP.set()  # never leak an open mic stream
        return interrupted
    await asyncio.to_thread(_play_bytes, buf.getvalue())
    return False


def _play_gtts(text: str, lang: str) -> None:
    from gtts import gTTS

    buf = io.BytesIO()
    gTTS(text=text, lang=(lang or "en").split("-")[0]).write_to_fp(buf)
    _play_bytes_interruptible(buf.getvalue())


async def _speak_segments(segments, interruptible: bool = True) -> bool:
    """Speak a sequence; stop the REST of the sequence on interruption."""
    total = len(segments)
    interrupted = False
    for index, (text, lang) in enumerate(segments, 1):
        _log(f"speech {index}/{total} ({lang}): {text!r}")
        await _speak(text, lang, interruptible=interruptible)
        if _INTERRUPT_FLAG.is_set():
            _log(f"speech {index}/{total} interrupted")
            interrupted = True
            break
        _log(f"speech {index}/{total} done")
    return interrupted


# ---- the state machine ------------------------------------------------------

class KioskStateMachine:
    """One kiosk session driver. Instantiate once; `start()` on the running
    loop (routes do this lazily), `request_trigger()` from GPIO or HTTP."""

    def __init__(self, api_base: str = API_BASE, session_id: str = SESSION_ID_BASE):
        self.api_base = api_base.rstrip("/")
        self.session_id_base = session_id

        self.state = State.IDLE
        self._task: asyncio.Task | None = None
        self._trigger_event = asyncio.Event()
        self._force_next = False        # skip CHECKING confirmation (tests/manual)
        self._idle_since = time.monotonic() - COOLDOWN_SECONDS  # fresh start: no wait
        self._camera_on = False         # we started the presence watcher
        self._gpio_thread: threading.Thread | None = None
        # httpx transport injection point (tests use MockTransport).
        self._transport = None

        # ---- one session's state (ALL cleared by _clear_session) -----------
        self._session_started_at: float | None = None   # time.monotonic()
        self._session_started_wall: float | None = None  # time.time()
        self._session_deadline: float | None = None
        self._deadline_warned = False
        self._session_id_for_turn: str = ""
        self._lang: str | None = None                    # locked language
        self._welcome_retries = 0
        self._silent_turns = 0
        self._turn_in_progress = False
        self._absent_since: float | None = None
        self._last_speech_at: float | None = None

        # Telemetry surfaced by GET /hardware/status.
        self.turns_answered = 0
        self.no_response_count = 0
        self.last_reason = "initialized"
        self.last_error: str | None = None
        self.transitions = 0

    # -- lifecycle -----------------------------------------------------------

    def start(self) -> bool:
        """Idempotently launch the loop on the CURRENT running event loop.
        False when there is no loop (scripts should use asyncio.run)."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return False
        if self._task is not None:
            return True
        self._task = loop.create_task(self.run())
        # A dead kiosk task must never silently look like GREETING forever.
        self._task.add_done_callback(_log_task_crash)
        self._start_gpio_watcher(loop)
        return True

    def request_trigger(self, force: bool = False) -> dict:
        """Arm the trigger; the IDLE loop honors it (after any cooldown)."""
        if self._task is not None and self._task.done():
            # The loop crashed/exited: clear it so start() relaunches.
            self._task = None
        self._force_next = self._force_next or force
        self._trigger_event.set()
        s = self.status()
        s["armed"] = True
        return s

    def status(self) -> dict:
        now = time.monotonic()
        cooldown_left = max(
            0.0, COOLDOWN_SECONDS - (now - self._idle_since)
        ) if self._idle_since else 0.0
        session_active = self._session_started_at is not None
        remaining = None
        if session_active and self._session_deadline is not None:
            remaining = max(0, round(self._session_deadline - now))
        return {
            "state": self.state.value,
            "gpio_available": GPIO_AVAILABLE,
            "trig_pin": ULTRASONIC_TRIG_PIN,
            "echo_pin": ULTRASONIC_ECHO_PIN,
            "camera_on": self._camera_on,
            "session_state": session_active and self.state.value or "inactive",
            "session_start": (
                _dt.datetime.fromtimestamp(
                    self._session_started_wall, tz=_dt.timezone.utc
                ).isoformat()
                if self._session_started_wall is not None
                else None
            ),
            "remaining_seconds": remaining,
            "session_timeout_minutes": SESSION_TIMEOUT_MINUTES,
            "grace_period_seconds": GRACE_PERIOD_SECONDS,
            "absence_grace_seconds": ABSENCE_GRACE_SECONDS,
            "detected_language": self._lang,
            "no_response_count": self.no_response_count,
            "no_response_end_count": 3,
            "welcome_retries": self._welcome_retries,
            "welcome_retries_allowed": WELCOME_RETRIES,
            "silent_turns": self._silent_turns,
            "listen_cap_seconds": LISTEN_CAP_SECONDS,
            "turns_answered": self.turns_answered,
            "cooldown_left": round(cooldown_left, 1),
            "last_reason": self.last_reason,
            "last_error": self.last_error,
            "transitions": self.transitions,
        }

    # -- GPIO sensor watcher (background thread → loop thread) ---------------

    def _start_gpio_watcher(self, loop: asyncio.AbstractEventLoop) -> None:
        if not GPIO_AVAILABLE or self._gpio_thread is not None:
            return
        if not ULTRASONIC_TRIG_PIN:
            _log("GPIO present but HARDWARE_TRIG_PIN unset — sensor idle")
            return

        def _arm_sensor() -> None:
            pin = int(ULTRASONIC_TRIG_PIN)
            GPIO.setmode(GPIO.BCM)
            echo_pin = int(ULTRASONIC_ECHO_PIN) if ULTRASONIC_ECHO_PIN else None
            if echo_pin is not None:
                # Raw HC-SR04 wiring: a distance probe thread triggers on
                # anything closer than the threshold.
                GPIO.setup(pin, GPIO.OUT, initial=GPIO.LOW)
                GPIO.setup(echo_pin, GPIO.IN)
                _log(
                    f"sensor arm: HC-SR04 TRIG=BCM{pin} ECHO=BCM{echo_pin}, "
                    "triggering on approach"
                )
                while True:
                    try:
                        dist = _gpio_distance_cm(GPIO, pin, echo_pin)
                    except Exception as exc:
                        _log(f"sensor read failed: {exc}")
                        time.sleep(5.0)
                        continue
                    if dist is not None and dist < 100.0:
                        loop.call_soon_threadsafe(self._sensor_fired, dist)
                        # Ignore sensor fluctuations during the cooldown.
                        time.sleep(COOLDOWN_SECONDS)
                    else:
                        time.sleep(0.2)
            else:
                # Comparator/trigger-board wiring: OUT gives a rising edge.
                GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

                def _on_edge(channel: int) -> None:
                    loop.call_soon_threadsafe(self._sensor_fired, None)

                GPIO.add_event_detect(
                    pin, GPIO.RISING, callback=_on_edge, bouncetime=5000
                )
                _log(f"sensor arm: rising-edge on BCM{pin}")

        thread = threading.Thread(target=_arm_sensor, daemon=True)
        thread.start()
        self._gpio_thread = thread

    def _sensor_fired(self, distance_cm: float | None) -> None:
        dist = f" at {distance_cm:.0f}cm" if distance_cm else ""
        _log(f"SENSOR TRIGGER{dist}")
        self.request_trigger()

    # -- the loop ---------------------------------------------------------------

    async def run(self) -> None:
        _log(f"state machine loop started (api={self.api_base})")
        while True:
            # ---- IDLE --------------------------------------------------------
            await self._enter(State.IDLE, "awaiting trigger")
            await self._trigger_event.wait()
            armed_force = self._force_next
            self._force_next = False
            self._trigger_event.clear()

            # Cooldown: a session that just ended must not restart on the
            # same hand movement; sensor noise in this window is ignored.
            while (time.monotonic() - self._idle_since) < COOLDOWN_SECONDS:
                remaining = COOLDOWN_SECONDS - (time.monotonic() - self._idle_since)
                _log(f"cooldown: {remaining:.1f}s before the next session")
                await asyncio.sleep(remaining + 0.05)

            # ---- CHECKING ----------------------------------------------------
            if armed_force and not GPIO_AVAILABLE:
                # Laptop demo mode (no RPi.GPIO): the sensor cannot confirm
                # an approach, so skip the CHECKING confirmation polling and
                # go straight to GREETING. The camera/presence watcher is
                # still STARTED for the session — it is never skipped.
                started = await self._presence_start()
                if not started:
                    _log("laptop mode: camera could not start; continuing session")
                confirmed = True
            else:
                confirmed = await self._do_checking()
            if not confirmed:
                await self._presence_stop(reason="no human confirmed at CHECKING")
                continue

            # ---- session begins ----------------------------------------------
            self._begin_session()
            try:
                await self._run_session()
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # never let one bad session kill the loop
                self.last_error = f"session crashed: {type(exc).__name__}: {exc}"
                _log(f"ERROR {self.last_error}")
                import traceback

                traceback.print_exc()
            finally:
                await self._end_session(reason=self.last_reason)

    def _begin_session(self) -> None:
        now = time.monotonic()
        self._session_started_at = now
        self._session_started_wall = time.time()
        self._session_deadline = now + SESSION_TIMEOUT_MINUTES * 60.0
        self._deadline_warned = False
        self._lang = None
        self._welcome_retries = 0
        self._silent_turns = 0
        self._absent_since = None
        self._last_speech_at = None
        # Unique per-session id: /chat/voice's existing conversation memory
        # keeps context across turns; a new session starts a fresh history.
        self._session_id_for_turn = (
            f"{self.session_id_base}-{int(time.time())}"
        )

    def _clear_session(self) -> None:
        self._session_started_at = None
        self._session_started_wall = None
        self._session_deadline = None
        self._deadline_warned = False
        self._session_id_for_turn = ""
        self._lang = None
        self._welcome_retries = 0
        self._silent_turns = 0
        self._turn_in_progress = False
        self._absent_since = None
        self._last_speech_at = None
        self.no_response_count = 0
        self._interrupt_flag_clear()

    def _interrupt_flag_clear(self) -> None:
        _INTERRUPT_FLAG.clear()
        _WATCHER_STOP.set()

    async def _run_session(self) -> None:
        """GREETING → the LISTENING ⇄ RESPONDING conversation → END."""
        # ---- GREETING ------------------------------------------------------
        await self._enter(State.GREETING, "human present")
        interrupted = await self._welcome_board()
        if not interrupted:
            # Welcome retries exhausted (or the farmer went absent):
            # the reason is already set — end the session.
            return
        await self._enter(State.LISTENING, "welcome answered/interrupted")

        # ---- conversation ---------------------------------------------------
        while True:
            # Session timer: warning at 1 min left, end at zero (see below).
            if await self._deadline_passing_checks():
                return

            turn = await self._listening_turn(reason="")
            if turn is None or turn.get("no_speech"):
                # No speech: the silent-turn ladder handles the repetition
                # (1 -> repeat prompt, 2 -> follow-up + final listen, 3 ->
                # end). A no_speech dict is truthy, so this MUST branch on
                # it too — not just on None, or the loop repeats forever.
                if await self._silent_turn_path():
                    return
                continue

            self._silent_turns = 0
            self.no_response_count = 0
            explicit_switch = turn.get("explicit_switch")  # lang or None
            if explicit_switch:
                self._lang = explicit_switch
                await self._enter(
                    State.RESPONDING, f"language switched to {self._lang}"
                )
                await _speak(SWITCH_ACKS[self._lang], self._lang)
                if await self._no_response_due_to_absence():
                    return
                if _INTERRUPT_FLAG.is_set():
                    await self._enter(State.LISTENING, "ack interrupted; listen")
                else:
                    await asyncio.sleep(LISTEN_BREAK_SECONDS)
                continue

            transcript = turn.get("transcript", "")
            answer = turn.get("answer", "")
            # Log every Q&A turn for the frontend session log.
            frontend_chat_log.append({"role": "user", "text": transcript})
            if answer:
                frontend_chat_log.append({"role": "assistant", "text": answer})
            unclear = bool(turn.get("unclear"))

            # Language: locked by the FIRST CLEAR transcript; never
            # auto-switches mid-session. Undetectable/unclear speech before
            # that point → ask the farmer which language, wait
            # LANG_TIMEOUT_SECONDS, default Telugu (spec Task 1).
            if self._lang is None and (unclear or not turn.get("detected_language")):
                _log(f"language undetectable ({turn.get('unclear') or 'no lang'})"
                     " → selection prompt")
                await self._enter(
                    State.RESPONDING, "language selection prompt"
                )
                await _speak_segments(LANGUAGE_CHOICE_SEGMENTS)
                pick = await self._listening_turn(
                    reason="language pick", cap=LANG_TIMEOUT_SECONDS
                )
                pick_lang = None
                if pick and not pick.get("no_speech") and pick.get("transcript"):
                    pick_lang = multilang.explicit_language_switch(
                        pick["transcript"]
                    ) or pick.get("detected_language")
                    if not pick_lang and not pick.get("unclear"):
                        pick_lang = multilang.preferred_language(
                            pick["transcript"]
                        )[0]
                if pick_lang:
                    self._lang = pick_lang
                else:
                    self._lang = DEFAULT_LANG
                _log(f"language locked: {self._lang} "
                     f"({'farmer choice' if pick_lang else 'defaulted (timeout)'})")
                if await self._absence_ended() or await self._deadline_passing_checks():
                    return
                continue  # this speech was the language pick, not a question

            if unclear:
                # Clear language already; treat garbage speech like silence.
                if await self._silent_turn_path():
                    return
                continue

            # Language: lock the FIRST clear transcript; never auto-switch.
            if self._lang is None:
                lang_from_endpoint = turn.get("detected_language") or "en"
                self._lang = lang_from_endpoint
                _log(f"language locked: {self._lang} (session)")

            if answer:
                self.turns_answered += 1
                answer_interrupted = await _speak(answer[:1200], self._lang)
                if answer_interrupted:
                    # The farmer interrupted the ANSWER: listen right away.
                    _log("answer interrupted by farmer speech; back to LISTENING")
                    if await self._absence_ended():
                        return
                    await self._enter(State.LISTENING, "interrupted; listen immediately")
                    continue
            else:
                _log("no answer text produced; using repeat prompt")
                await _speak(
                    REPEAT_PROMPTS.get(self._lang, REPEAT_PROMPTS["en"]),
                    self._lang,
                )
            if await self._no_response_due_to_absence():
                return
            if await self._deadline_passing_checks():
                return
            # Natural follow-up after each answer: "anything else?"
            await self._enter(State.RESPONDING, "follow-up prompt")
            await _speak(FOLLOWUP_PROMPTS.get(self._lang, FOLLOWUP_PROMPTS["en"]),
                         self._lang)
            if await self._no_response_due_to_absence():
                return
            if await self._deadline_passing_checks():
                return
            await asyncio.sleep(LISTEN_BREAK_SECONDS)

    async def _welcome_board(self) -> bool:
        """Welcome with up to WELCOME_RETRIES repeats while nobody responds.

        Returns True when the farmer's speech interrupted the last playback
        (the caller skips ahead to LISTENING).
        """
        while self._welcome_retries <= WELCOME_RETRIES:
            segments = WELCOME_SEGMENTS if self._welcome_retries == 0 else (
                WELCOME_RETRY_SEGMENTS
            )
            if self._welcome_retries > 0:
                await self._enter(
                    State.GREETING,
                    f"welcome retry {self._welcome_retries}/{WELCOME_RETRIES}",
                )
                await asyncio.sleep(WELCOME_RETRY_DELAY_SECONDS)
                if await self._deadline_passing_checks():
                    return True
                if await self._absence_ended():
                    return False
            self._welcome_retries += 1
            interrupted = await _speak_segments(segments)
            if interrupted:
                _log("welcome interrupted by farmer speech; going to LISTENING")
                return True
            if await self._absence_ended():
                return False
        _log("welcome retries exhausted; no response")
        self.last_reason = "no response to repeated welcomes"
        return False

    async def _absence_ended(self) -> bool:
        """END when the farmer has been continuously absent for
        ABSENCE_GRACE_SECONDS with no speech activity and no turn in progress.
        Keeps the session alive otherwise (farmer may be walking back)."""
        present = await self._presence_still_present()
        now = time.monotonic()
        if present:
            self._absent_since = None
            return False
        if self._absent_since is None:
            self._absent_since = now
            _log(f"absence grace started ({ABSENCE_GRACE_SECONDS:.0f}s)")
        away = now - self._absent_since
        quiet = (
            self._last_speech_at is None
            or (now - self._last_speech_at) >= ABSENCE_GRACE_SECONDS
        )
        if (
            away >= ABSENCE_GRACE_SECONDS
            and quiet
            and not self._turn_in_progress
        ):
            self.last_reason = "farmer absent beyond grace period"
            await self._enter(State.END, self.last_reason)
            return True
        _log(f"absence {away:.0f}s < grace; keeping session alive")
        return False

    async def _deadline_passing_checks(self) -> bool:
        """One-min warning, timeout end, finish-in-grace handling. True=END."""
        if self._session_deadline is None:
            return False
        now = time.monotonic()
        remaining = self._session_deadline - now
        if not self._deadline_warned and remaining <= 60.0 and remaining > 0:
            self._deadline_warned = True
            _log(f"session timeout warning: {remaining:.0f}s remaining")
            await self._enter(State.RESPONDING, "session timeout warning (1 min)")
            if self._lang is None:
                # Language not locked yet: warn in all three, short.
                for lang, prompt in TIMEOUT_WARNING_PROMPTS.items():
                    await _speak(prompt, lang, interruptible=False)
            else:
                await _speak(
                    TIMEOUT_WARNING_PROMPTS.get(self._lang, ""), self._lang
                )
        if remaining <= 0:
            if self._turn_in_progress:
                in_grace = now <= self._session_deadline + GRACE_PERIOD_SECONDS
                if in_grace:
                    return False  # let the turn finish
                self.last_reason = "grace period expired during turn"
                _INTERRUPT_FLAG.set()
                await self._enter(State.END, self.last_reason)
                return True
            lang = self._lang or DEFAULT_LANG
            end_reason = "session timeout"
            self.last_reason = end_reason
            _log("session timeout: ending session")
            await self._enter(State.RESPONDING, "session timeout outro")
            await _speak(TIMEOUT_OUTRO_PROMPTS.get(lang), lang or DEFAULT_LANG)
            # The exact end reason (not the outro label), so run()'s finally
            # reports the real cause to the status surface.
            await self._enter(State.END, end_reason)
            return True
        return False

    async def _listening_turn(
        self, reason: str = "", cap: float | None = None
    ) -> dict | None:
        """One LISTENING turn: mic → /chat/voice → processed turn dict."""
        if reason:
            _log(f"listening window: {reason}")
        self._turn_in_progress = True
        try:
            turn = await self._do_listening(cap_seconds=cap)
        finally:
            self._turn_in_progress = False
        if turn is None:
            return None
        if turn.get("no_speech"):
            return turn
        transcript = turn.get("transcript", "")
        from app.services import multilang

        clear, why = multilang.is_clear_transcript(transcript)
        switch = multilang.explicit_language_switch(transcript)
        if switch:
            turn["explicit_switch"] = switch
            return turn
        if not clear:
            turn["unclear"] = why
            _log(f"unclear transcript ({why})")
        return turn

    async def _silent_turn_path(self) -> bool:
        """Nobody spoke. Returns True when the session should END.

        - Pre-first-answer (welcome phase): repeats are handled by the
          GREETING board; a silence at this point just tries again.
        - In conversation: 1 silent turn → repeat prompt; 2 → follow-up
          prompt + one last listening window; 3 → END.
        """
        self._silent_turns += 1
        self.no_response_count = self._silent_turns
        if self._absent_since is not None and await self._absence_ended():
            return True
        if self._silent_turns <= 1:
            await self._enter(
                State.RESPONDING,
                f"repeat prompt (silent turn {self._silent_turns}/2)",
            )
            await _speak(
                REPEAT_PROMPTS.get(self._lang or "en", REPEAT_PROMPTS["en"]),
                self._lang or "en",
            )
            if await self._absence_ended():
                return True
            return False
        if self._silent_turns == 2:
            await self._enter(
                State.RESPONDING, "2 silent turns: follow-up prompt"
            )
            await _speak(
                FOLLOWUP_SILENT_PROMPTS.get(
                    self._lang or "en", FOLLOWUP_SILENT_PROMPTS["en"]
                ),
                self._lang or "en",
            )
            if await self._absence_ended():
                return True
            # One last listening window after the follow-up prompt.
            turn = await self._listening_turn(reason="final listen")
            if turn is not None and not turn.get("no_speech"):
                self._silent_turns = 0
                self.no_response_count = 0
                self._lang = self._lang or turn.get("detected_language") or DEFAULT_LANG
                self.turns_answered += 1
                await self._enter(
                    State.RESPONDING, f"answered ({self._lang}) (turn {self.turns_answered})"
                )
                await _speak((turn.get("answer") or REPEAT_PROMPTS["en"])[:1200], self._lang)
                return await self._no_response_due_to_absence()
            self.last_reason = "ended after follow-up prompt (still silent)"
            await self._enter(State.END, self.last_reason)
            return True
        self.last_reason = f"{self._silent_turns} consecutive silent turns"
        await self._enter(State.END, self.last_reason)
        return True

    async def _no_response_due_to_absence(self) -> bool:
        """Shared post-turn exit check, ending on absence or timeout."""
        if await self._absence_ended():
            return True
        if await self._deadline_passing_checks():
            return True
        return False

    async def _enter(self, state: State, reason: str) -> None:
        self.state = state
        self.last_reason = reason
        self.transitions += 1
        _log(f"-> {state.value} ({reason})")

    # -- state actions ----------------------------------------------------------

    def _client(self, timeout: float = 15.0) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=timeout, transport=self._transport)

    async def _presence_start(self) -> bool:
        """POST /presence/start once — camera ON without any confirmation.

        Returns True when the watcher is running (or already running).
        Sets `last_error` and returns False when the camera cannot open.
        """
        async with self._client() as client:
            try:
                resp = await client.post(
                    f"{self.api_base}/presence/start",
                    params={"camera_index": CAMERA_INDEX},
                )
                body = resp.json()
            except (httpx.HTTPError, ValueError) as exc:
                self.last_error = f"presence/start failed: {exc}"
                _log(f"ERROR {self.last_error}")
                return False

        if body.get("status") == "already_running":
            self._camera_on = True
            _log("presence watcher already running (camera on)")
            return True
        if body.get("status") in ("camera_busy", "stopped", "error"):
            self.last_error = f"presence/start camera issue: {body.get('status')}"
            _log(f"camera start failed: {self.last_error}")
            return False
        self._camera_on = True
        _log(f"presence watcher running ({body.get('status')})")
        return True

    async def _do_checking(self) -> bool:
        """Start the presence watcher and confirm a human within N frames."""
        await self._enter(State.CHECKING, "trigger armed")
        if not await self._presence_start():
            return False
        _log(f"polling {CHECKING_STATUS_FRAMES} frames")
        async with self._client() as client:
            for frame in range(CHECKING_STATUS_FRAMES):
                await asyncio.sleep(CHECKING_POLL_SECONDS)
                try:
                    status = (await client.get(
                        f"{self.api_base}/presence/status"
                    )).json()
                except (httpx.HTTPError, ValueError) as exc:
                    self.last_error = f"presence/status failed: {exc}"
                    _log(f"ERROR {self.last_error}")
                    return False
                faces, streak = status.get("faces", 0), status.get("streak", 0)
                _log(f"frame {frame + 1}/{CHECKING_STATUS_FRAMES}: "
                     f"faces={faces} streak={streak}")
                if status.get("present"):
                    return True
        return False

    async def _do_listening(self, cap_seconds: float | None = None) -> dict | None:
        """Record the mic and POST /chat/voice.

        Returns a turn dict:
            {"no_speech": True}                          nobody spoke
            {"failed": str}                              mic/endpoint error
            {"transcript","answer","provider","cached",
             "detected_language"}                        a usable turn
        """
        try:
            wav, _, stats = await asyncio.to_thread(
                _record_clip, cap_seconds or LISTEN_CAP_SECONDS
            )
        except Exception as exc:
            self.last_error = f"mic capture failed: {exc}"
            _log(f"ERROR {self.last_error}")
            return {"failed": str(exc)}
        _log(f"[mic] {stats}")

        if stats.get("ended_by") == "no speech detected" or not wav:
            return {"no_speech": True, "stats": stats}
        if stats.get("speech_seconds", 0) >= MIN_SPEECH_SECONDS:
            self._last_speech_at = time.monotonic()

        mime = "audio/wav"
        # Same live timeout as before, but via _client() so the injectable
        # transport (tests) and any future middleware stay consistent.
        async with self._client(timeout=120.0) as client:
            try:
                resp = await client.post(
                    f"{self.api_base}/chat/voice",
                    params={"session_id": self._session_id_for_turn},
                    files={"file": ("question.wav", wav, mime)},
                )
            except (httpx.HTTPError, ValueError) as exc:
                self.last_error = f"/chat/voice failed: {exc}"
                _log(f"ERROR {self.last_error}")
                return {"failed": str(exc)}

            if resp.status_code == 429:
                # Quota exhausted: looping retries would just burn turns.
                self.last_error = (
                    f"/chat/voice quota exhausted: {resp.json().get('detail')}"
                )
                _log(f"ERROR {self.last_error}")
                return {"failed": "voice quota exhausted"}
            resp.raise_for_status()
            reply = resp.json()

        transcript = reply.get("transcribed_text", "") or ""
        answer = reply.get("answer", "") or ""
        if answer.startswith("Voice input is unavailable"):
            # The degraded no-STT-engine response: count as a failed turn.
            self.last_error = "no transcription engine available"
            return {"failed": "no transcription engine available"}

        turn = {
            "transcript": transcript,
            "answer": answer,
            "provider": reply.get("provider"),
            "cached": reply.get("cached"),
            "detected_language": reply.get("detected_language"),
        }
        _log(f"[stt] {transcript!r} -> [rag] {reply.get('provider')} "
             f"cached={reply.get('cached')} lang={turn['detected_language']}")
        return turn

    async def _presence_still_present(self) -> bool:
        """True while the farmer is still standing in front of the kiosk."""
        async with self._client() as client:
            try:
                status = (
                    await client.get(f"{self.api_base}/presence/status")
                ).json()
            except (httpx.HTTPError, ValueError) as exc:
                # Watcher down: not the same as 'person left' — keep talking.
                _log(f"presence/status unavailable ({exc}); assuming present")
                return True
        if status.get("status") == "stopped":
            return True  # watcher stopped outside our control; not 'left'
        return bool(status.get("present"))

    async def _presence_stop(self, reason: str) -> None:
        """Camera off: POST /presence/stop (idempotent, safe to always call)."""
        async with self._client() as client:
            try:
                await client.post(f"{self.api_base}/presence/stop")
            except (httpx.HTTPError, ValueError) as exc:
                self.last_error = f"presence/stop failed: {exc}"
                _log(f"ERROR {self.last_error}")
        self._camera_on = False
        _log(f"camera off ({reason})")

    async def _end_session(self, reason: str) -> None:
        """Clean session end: camera off, TTS stopped, state cleared."""
        await self._enter(State.END, reason)
        _INTERRUPT_FLAG.set()  # stop any playing TTS immediately
        await asyncio.to_thread(_sd_stop_all)
        await self._presence_stop(reason=reason)
        self._clear_session()
        # The post-session cooldown starts when the session actually
        # ENDS — the very first trigger after boot must never wait.
        self._idle_since = time.monotonic()
        _log("session state cleared; back to IDLE after cooldown")


def _gpio_distance_cm(GPIO, trig_pin: int, echo_pin: int) -> float | None:
    """One raw HC-SR04 pulse read (blocking; runs in the sensor thread only)."""
    import time as _t

    GPIO.output(trig_pin, GPIO.HIGH)
    _t.sleep(0.00001)
    GPIO.output(trig_pin, GPIO.LOW)

    timeout = _t.monotonic() + 0.05
    while GPIO.input(echo_pin) == GPIO.LOW:
        if _t.monotonic() > timeout:
            return None
    start = _t.monotonic()
    while GPIO.input(echo_pin) == GPIO.HIGH:
        if _t.monotonic() > start + 0.05:
            return None
    elapsed = _t.monotonic() - start
    return elapsed * 17150.0  # cm (343 m/s round trip)


# ---------------------------------------------------------------------------
# Module singleton + blocking entry point for headless/direct use
# ---------------------------------------------------------------------------

_machine: KioskStateMachine | None = None


def get_machine() -> KioskStateMachine:
    """The process-wide kiosk machine (routes/ and GPIO both use this)."""
    global _machine
    if _machine is None:
        _machine = KioskStateMachine()
    return _machine


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    machine = get_machine()
    _log("manual run: force-greeting a session (no trigger needed)")
    machine.request_trigger(force=True)
    asyncio.run(machine.run())
