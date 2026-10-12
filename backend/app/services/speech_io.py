# speech_io.py — microphone capture + local TTS playback for the speech test.
#
# Standalone Stage (speech-to-speech test, NOT wired into the FastAPI app:
# /chat and /chat/voice are unaffected). Free/local only:
#   - Recording: sounddevice -> int16 WAV mono 16 kHz (the same envelope the
#     /chat/voice endpoint accepts every day). Honors the existing 60-second
#     TURN_CAP_SECONDS from voice_limit so the upstream endpoint never has to
#     reject the upload; stops early on ~1.5s of sustained silence.
#   - Playback: pyttsx3 (SAPI5 on Windows) — offline, no API keys.

import time
from pathlib import Path
from typing import Optional

import numpy as np
import sounddevice as sd
import wave

from app.services import voice_limit

# speech_io.py -> app/services/ -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]

SAMPLE_RATE = 16_000      # mono 16 kHz, matches what /chat/voice expects
CHANNELS = 1
SPEAK_PROMPT_SECONDS = 0.8   # grace before recording starts
SILENCE_STOP_SECONDS = 1.5   # sustained quiet that ends the recording early
SILENCE_RMS_THRESHOLD = 0.01  # int16 amplitude RMS below this counts as quiet

RECORD_PROMPT = "Listening... ask your question now."     # for the TTS voice
NO_SPEECH_PROMPT = "I didn't hear anything. Please try again."


def list_input_devices() -> list[dict]:
    """Names of usable sounddevice inputs (for debugging mic selection)."""
    out = []
    for i, d in enumerate(sd.query_devices()):
        if d["max_input_channels"] > 0:
            out.append({"index": i, "name": d["name"], "channels": d["max_input_channels"]})
    return out


def record_clip(
    max_seconds: Optional[float] = None,
    silence_stop: float = SILENCE_STOP_SECONDS,
    sample_rate: int = SAMPLE_RATE,
    channels: int = CHANNELS,
) -> tuple[bytes, float, dict]:
    """Record a question from the default microphone as WAV bytes.

    Records up to `max_seconds` audio (defaults to the voice endpoint's
    TURN_CAP_SECONDS) but stops as soon as the speaker has been silent for
    `silence_stop` seconds, so a short question doesn't wait the full minute.
    Returns (wav_bytes, speech_duration_seconds, stats).
    """
    cap = float(max_seconds if max_seconds is not None else voice_limit.TURN_CAP_SECONDS)
    blocks: list[np.ndarray] = []
    block_samples = int(sample_rate * 0.1)  # 100 ms blocks

    # Small pre-roll so the TTS 'Listening...' prompt does not bleed into the
    # farmer's first word.
    time.sleep(SPEAK_PROMPT_SECONDS)

    last_loud_idx = -1
    recorded = 0.0  # audio seconds captured (silence included)
    with sd.InputStream(
        samplerate=sample_rate, channels=channels, dtype="int16"
    ) as stream:
        while recorded < cap:
            data, _ = stream.read(block_samples)
            data = np.asarray(data, dtype=np.int16)[:, 0].copy()
            blocks.append(data)
            recorded += data.shape[0] / sample_rate
            audio = data.astype(np.float64) / 32768.0
            rms = float(np.sqrt(np.mean(audio * audio))) if audio.size else 0.0
            if rms >= SILENCE_RMS_THRESHOLD:
                last_loud_idx = len(blocks) - 1
            # Stop when: something has been said, followed by silence_stop of
            # quiet — i.e., the last loud block is more than silence_stop ago.
            if last_loud_idx >= 0:
                quiet_for = recorded - (last_loud_idx + 1) * 0.1
                if quiet_for >= silence_stop:
                    break

    pcm = np.concatenate(blocks)
    # Trim trailing silence (keep a 0.2 s tail as padding, not silence_stop s).
    if last_loud_idx >= 0:
        keep = ((last_loud_idx + 1) * block_samples) + int(0.2 * sample_rate)
        trimmed = pcm[: min(keep, pcm.shape[0])]
    else:
        trimmed = pcm  # never spoke; full capture for the 'no speech' path
    speech_duration = trimmed.shape[0] / sample_rate

    import io
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)  # int16
        w.setframerate(sample_rate)
        w.writeframes(np.ascontiguousarray(trimmed, dtype=np.int16).tobytes())
    wav_bytes = buf.getvalue()

    stats = {
        "max_seconds": cap,
        "captured_seconds": round(recorded, 1),
        "speech_seconds": round(speech_duration, 1),
        "ended_by": "silence" if last_loud_idx >= 0 else "no speech detected",
        "silence_stop": silence_stop,
    }
    return wav_bytes, speech_duration, stats


def speak(text: str, rate: int = 170, voice_hint: Optional[str] = None) -> dict:
    """Play `text` aloud with the offline SAPI5 voice (pyttsx3).

    Blocks until playback finishes. Returns a small stats dict for the test
    log (duration is wall-clock, including the engine's own startup).
    """
    import pyttsx3

    engine = pyttsx3.init()
    try:
        engine.setProperty("rate", rate)  # words per minute-ish
        if voice_hint:
            for v in engine.getProperty("voices"):
                if voice_hint.lower() in (v.name or "").lower():
                    engine.setProperty("voice", v.id)
                    break
        start = time.monotonic()
        engine.say(text)
        engine.runAndWait()
        engine.stop()
        duration = time.monotonic() - start
    finally:
        engine.stop()
    return {"spoken_chars": len(text), "wall_seconds": round(duration, 1)}


# ---------------------------------------------------------------------------
# Local-only smoke: `python -m app.services.speech_io`
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print("input devices:", list_input_devices())
    print("speak test...")
    print("-> ", speak("Speech interface test successful."))
    print("recording test (speak, then stay quiet for ~1.5s)...")
    wav, duration, stats = record_clip()
    out = BACKEND_DIR / "test_recordings"
    out.mkdir(exist_ok=True)
    path = out / f"speech_test_{int(time.time())}.wav"
    path.write_bytes(wav)
    print(f"saved {stats} -> {path}")
