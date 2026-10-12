# run_speech_test.py — standalone laptop speech-to-speech test (Stage 3 test flow).
#
# Standalone: run `python run_speech_test.py` from backend/. NOT wired into
# the FastAPI app — /chat and /chat/voice remain completely unaffected; this
# script only POSTs to a locally running uvicorn :8000 /chat/voice endpoint,
# exactly like the future frontend would.
#
# Flow (uses ONLY the built-in camera + mic, all local, free):
#   1. presence.py  -> watch webcam, edge-trigger on NEW person arrival
#   2. on arrival   -> print "person detected", speak a greeting, record the
#                      mic for up to voice_limit.TURN_CAP_SECONDS, stopping
#                      early after ~1.5 s of silence
#   3. POST WAV     -> the EXISTING localhost /chat/voice endpoint (RAG +
#                      provider rotation + cache, otherwise untouched)
#   4. speak()      -> read the returned answer aloud in the farmer's own
#                      language (Stage B: edge-tts neural te/hi/en -> gTTS ->
#                      offline pyttsx3 last resort), with a "please repeat"
#                      prompt when the transcript is unclear
#
# Repeats until the person leaves view; Ctrl+C exits cleanly.

import io
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services import presence, speech_io, multilang, answer_speaker  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parent
API_BASE = "http://127.0.0.1:8000"
SESSION_ID = "speech-test-laptop"

ANSWER_MAX_SPEAK_SECONDS = 45  # don't read a very long answer forever


# Per-language greeting / repeat prompts (spoken in that language).
GREETINGS = {
    "te": "నమస్కారం! మీ ప్రశ్న చెప్పండి.",
    "hi": "नमस्ते! अपना सवाल बताइए।",
    "en": "Hello! Please ask your question.",
}
REPEAT_PROMPTS = {
    "te": "క్షమించండి, నాకు వినిపించలేదు. దయచేసి మళ్ళీ చెప్పండి.",
    "hi": "क्षमा करें, मुझे समझ नहीं आया। कृपया दोबारा बताइए।",
    "en": "Sorry, I could not hear that clearly. Please say it again.",
}
LANG_NAMES = {"te": "Telugu", "hi": "Hindi", "en": "English"}
DEFAULT_LANG = "en"  # first greeting language before any detection


def check_server(timeout: float = 3.0) -> bool:
    """True when the existing FastAPI app is reachable and healthy."""
    try:
        r = requests.get(f"{API_BASE}/", timeout=timeout)
        return r.status_code == 200
    except requests.RequestException as exc:
        print(f"[test] API not reachable at {API_BASE}: {exc}")
        return False


def post_to_voice_endpoint(wav_bytes: bytes, mime: str = "audio/wav") -> dict:
    """Send the clip through the EXISTING /chat/voice pipeline (unchanged)."""
    files = {"file": ("question.wav", wav_bytes, mime)}
    data = {"session_id": SESSION_ID}
    r = requests.post(f"{API_BASE}/chat/voice", files=files, data=data, timeout=90)
    r.raise_for_status()
    return r.json()


def run_one_turn(watcher: "presence.PresenceWatcher", cycle: int) -> bool:
    """One arrival -> question -> answer -> speak cycle.

    Present and gating requirements:
      1. Greeting + recording only while the person is visible (edge-triggered
         arrival -> one turn -> cooldown).
      2. Speaking the answer: the person must STILL be visible while TTS plays
         (stop-Speaking-early if they walk away); the test also doubles as
         the human-abort key ('1' = cut short).
      3. Answer is spoken in the language the STT detected.
    """
    print(f"\n=== cycle {cycle}: asking ----------")
    # A. Face-visible gate before any audio leaves the laptop.
    if not watcher._face_present:
        print("[presence] person left before the question was asked -> re-arm")
        return True
    answer_speaker.speak(GREETINGS[DEFAULT_LANG], DEFAULT_LANG)
    wav, duration, stats = speech_io.record_clip()
    print(f"[mic] {stats}")

    if stats["ended_by"] == "no speech detected":
        answer_speaker.speak(speech_io.NO_SPEECH_PROMPT, "en")
        return True  # wait for next arrival/cooldown cycle

    # Save the raw clip for the test artifact/troubleshooting.
    out = BACKEND_DIR / "test_recordings"
    out.mkdir(exist_ok=True)
    clip_path = out / f"speech_test_{int(time.time())}.wav"
    clip_path.write_bytes(wav)
    print(f"[mic] clip saved -> {clip_path.name} ({len(wav) / 1024:.0f} KB)")

    # --- Stage B: clear-transcript gate BEFORE spending the API call -------
    # A quick local pre-check: the exact-known clips replay through Gemini's
    # JSON-schema transcription (with language detection) in this script, so
    # the farmer gets a "please repeat" when their own clip sounds unclear.
    try:
        probe = multilang.transcribe_with_language(wav)
    except Exception as exc:
        print(f"[stt] transcribe_with_language failed: {exc}")
        answer_speaker.speak(REPEAT_PROMPTS[DEFAULT_LANG], DEFAULT_LANG)
        return True
    transcript_raw = probe.get("transcript", "")
    lang_code = probe.get("language_code", "en")
    lang = (lang_code or "en").split("-")[0].lower()
    if lang not in GREETINGS:  # e.g. ta/ml/kn creep: keep preset languages
        print(f"[stt] language {lang_code!r} unsupported; answering in English")
        lang = "en"
    norm, fixes = multilang.normalize_transcript(transcript_raw)
    print(f"[stt] transcript ({lang_code}): {transcript_raw!r}")
    if fixes:
        print(f"[stt] normalization fixes: {fixes}")
    print(f"[stt] normalized: {norm!r} | lang={lang}")

    gate_ok, gate_reason = multilang.is_clear_transcript(norm)
    if not gate_ok:
        print(f"[stt] unclear transcript ({gate_reason}) -> asking to repeat")
        answer_speaker.speak(REPEAT_PROMPTS[lang], lang)
        return True

    print("[api] POST /chat/voice ...")
    t0 = time.monotonic()
    try:
        reply = post_to_voice_endpoint(wav)
    except requests.HTTPError as exc:
        body = exc.response.text[:200] if exc.response is not None else "?"
        print(f"[api] HTTP error: {exc} | body: {body}")
        answer_speaker.speak(REPEAT_PROMPTS[lang], lang)
        return True
    dt = time.monotonic() - t0
    print(f"[api] answered in {dt:.1f}s | provider={reply['provider']} cached={reply['cached']}")
    print(f"[stt] endpoint transcript: {reply['transcribed_text']}")
    print(f"[rag] answer: {reply['answer'][:300]}{'...' if len(reply['answer']) > 300 else ''}")

    print(f"[tts] speaking answer in {lang} ({LANG_NAMES.get(lang, lang)})...")
    t0 = time.monotonic()
    try:
        result = answer_speaker.speak(reply["answer"][:1200], lang)
    finally:
        # Always re-arm the abort flag; presence gate decides whether speech
        # may continue past this turn.
        answer_speaker.reset_speaking_abort()
    print(f"[tts] {result} (wall {time.monotonic() - t0:.1f}s)")

    # Person must STILL be visible while the answer is spoken. If they've
    # left, drop the remainder of the audio and skip the re-arm wait.
    if not watcher._face_present:
        print("[presence] person left mid-answer -> stopping speech early")
        answer_speaker.stop_speaking_early()
        return True

    # Re-arm for the next turn after the answer finishes.
    print("[test] waiting for the person to leave view ...")
    deadline = time.monotonic() + 20
    while time.monotonic() < deadline:
        state = watcher.poll()
        if watcher._face_present is False:
            break
        time.sleep(0.2)
    return True


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print("=== speech-to-speech TEST (laptop camera + mic only) ===")

    if not check_server():
        print(
            "Start the API first, in another terminal:\n"
            "  cd backend && .venv/Scripts/python -m uvicorn main:app --port 8000"
        )
        return

    watcher = presence.PresenceWatcher(
        on_person=lambda: print("person detected"),
        cooldown_seconds=6.0,
    )
    # Reset the mid-answer abort flag at the start of every cycle so we never
    # carry a leftover '1' across turns.
    answer_speaker.reset_speaking_abort()
    print("watching the webcam (Ctrl+C to stop). Show a face to the camera...")
    cycle = 0
    try:
        watcher.start()
        while True:
            state = watcher.poll()
            if state["fired"]:
                cycle += 1
                for reason in state["reasons"]:
                    print(f"[presence] TRIGGER: {reason}")
                run_one_turn(watcher, cycle)
                # Cooldown ensures one arrival -> one turn (no re-trigger
                # while the same person stays).
            time.sleep(presence.POLL_SECONDS)
    except KeyboardInterrupt:
        print("\n[test] stopped by user (Ctrl+C)")
    finally:
        watcher.stop()
        print("[test] camera released. /chat and /chat/voice were untouched.")


if __name__ == "__main__":
    main()
