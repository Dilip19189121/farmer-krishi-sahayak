# answer_speaker.py — speak the RAG answer in the farmer's language (Stage B).
#
# Standalone Stage (NOT wired into the FastAPI app). Priority order:
#   1. edge-tts neural voice (te-IN-ShrutiNeural / hi-IN-SwaraNeural /
#      en-IN-NeerjaNeural) — best Indic quality; needs internet;
#   2. gTTS (Google Translate TTS voice) — good quality; needs internet;
#   3. pyttsx3 offline (en-only Hindi-accent) — LAST RESORT: speaks English
#      text clearly; Indic scripts in Devanagari/Telugu are spelled out,
#      which is worse than switching the language of the reply, so it is
#      only used after an English translation attempt fails.
#
# Verified against round-trip Gemini STT for Telugu, Hindi, and English
# (see Stage-B test logs). lanugages map used for edge-tts voices:
#   te: ShrutiNeural   hi: SwaraNeural   en: NeerjaNeural (Indian accent)

import io
import tempfile
import time
import wave
from pathlib import Path

# answer_speaker.py -> app/services/ -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]
OUT_DIR = BACKEND_DIR / "test_recordings"

# Preferred neural voices per language; fallback chains apply downward.
VOICE_BY_LANG = {
    "te": "te-IN-ShrutiNeural",
    "hi": "hi-IN-SwaraNeural",
    "en": "en-IN-NeerjaNeural",
}
GTTIS_LANG = {"te": "te", "hi": "hi", "en": "en"}
LANG_NAME = {"te": "Telugu", "hi": "Hindi", "en": "English"}


def speak(text: str, lang: str = "en") -> dict:
    """Speak `text` aloud in `lang`, with graceful degradation.

    Returns {"spoken_with": engine, "lang": lang, "wall_seconds": float,
             "note": why a step was skipped}. Chooses the best available
    engine; when the language itself is unavailable everywhere (e.g. all
    offline), falls back to Hindi -> English text before giving up.
    """
    start = time.monotonic()
    attempts: list[str] = []

    # 1. Neural voice (best quality, needs internet).
    try:
        _play_edge(text, lang)
        return {"spoken_with": f"edge-tts {VOICE_BY_LANG[lang]}", "lang": lang,
                "wall_seconds": round(time.monotonic() - start, 1),
                "note": "neural voice"}
    except Exception as exc:
        attempts.append(f"edge-tts {lang}: {type(exc).__name__}: {exc}")

    # 2. gTTS (still decent, needs internet).
    try:
        _play_gtts(text, lang)
        return {"spoken_with": f"gtts {lang}", "lang": lang,
                "wall_seconds": round(time.monotonic() - start, 1),
                "note": f"fallback after: {'; '.join(attempts)}"}
    except Exception as exc:
        attempts.append(f"gtts {lang}: {type(exc).__name__}: {exc}")

    # 3. Offline pyttsx3: only genuinely useful for Latin-script text. For
    #    Telugu/Devanagari it would spell out codepoints — worse than silent
    #    failure, so try a same-pipeline English translation of the text
    #    first, then settle for reading whatever is speakable.
    speakable = text
    if lang != "en":
        translated = _translate_to_english(text)
        if translated:
            speakable = translated
            attempts.append(f"offline: translating to English first")
    try:
        from app.services import speech_io

        stats = speech_io.speak(speakable[:1200])
        return {"spoken_with": "pyttsx3 offline", "lang": "en",
                "wall_seconds": round(time.monotonic() - start, 1),
                "note": f"LAST RESORT offline English; earlier: {'; '.join(attempts)}; tts stats: {stats}"}
    except Exception as exc:
        return {"spoken_with": "SILENT FAILURE", "lang": lang,
                "wall_seconds": round(time.monotonic() - start, 1),
                "note": f"no engine worked: {'; '.join(attempts)}; offline failed: {exc}"}


def _play_edge(text: str, lang: str) -> None:
    import asyncio

    import edge_tts
    import soundfile as sf  # already a dependency of the speech test
    import numpy as np
    from scipy.signal import resample_poly

    buf = io.BytesIO()

    async def _run() -> None:
        communicate = edge_tts.Communicate(text, voice=VOICE_BY_LANG[lang])
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])

    asyncio.run(_run())
    if buf.tell() == 0:
        raise RuntimeError("edge-tts produced no audio")
    _play_wav_bytes(buf.getvalue())


def _play_gtts(text: str, lang: str) -> None:
    from gtts import gTTS

    buf = io.BytesIO()
    gTTS(text=text, lang=GTTIS_LANG.get(lang, "en")).write_to_fp(buf)
    buf.seek(0)
    _play_wav_bytes(buf.getvalue())


def _play_wav_bytes(audio_bytes: bytes) -> None:
    """Decode (mp3 or wav-ish) bytes with soundfile, resample to a sane rate,
    and hand the frames to the OS default output via sounddevice."""
    import numpy as np
    import sounddevice as sd
    import soundfile as sf
    from scipy.signal import resample_poly

    audio, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    # Output at the decoded rate; keep frames as float32 for sounddevice.
    max_rate = 48000
    if sr > max_rate:
        g = np.gcd(int(sr), max_rate)
        audio = resample_poly(audio, max_rate // g, int(sr) // g)
        sr = max_rate
    # Save for the test artifact + human listening checks.
    OUT_DIR.mkdir(exist_ok=True)
    pcm16 = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2")
    out_path = OUT_DIR / f"spoken_{int(time.time())}_{sr}Hz.wav"
    with wave.open(str(out_path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(int(sr))
        w.writeframes(pcm16.tobytes())
    sd.play(audio, samplerate=int(sr))
    _play_thread = threading.Thread(
        target=_wait_player, args=(audio, int(sr)), daemon=True
    )
    _play_thread.start()


def _wait_player(audio, sr: int) -> None:
    """Block the player thread until the user hits 1 (abort) or the buffer
    drains. This is the pad between the OS audio device and the abort flag:
    pressing 1 while speech is still draining drops the rest of the buffer."""
    import numpy as np
    import sounddevice as sd

    if _abbrev_event.wait(timeout=float(len(audio)) / float(sr)):
        # Drop the remaining frames: silence through the default device rather
        # than letting the speaker tail off.
        leftover = int(0.25 * float(sr))
        if leftover > 0 and audio.size > leftover:
            sd.play(np.zeros(leftover, dtype=np.float32), samplerate=sr)
            sd.wait()




# -- stop-speaking-while-speaking: person walks away mid-answer -------------
# The answer is played through the OS audio device, so a callback-driven
# abort is not possible; instead a separate thread watches the keyboard and
# signals the player to drop the buffer early. The presence watcher gates
# this whole block, so the default path is: person visible while TTS plays.
import threading

_abbrev_event = threading.Event()


def _keypress_reader() -> None:
    """Read keypresses until the user presses 1 (abort mid-answer)."""
    try:
        import msvcrt

        while not _abbrev_event.is_set():
            if msvcrt.kbhit():
                ch = msvcrt.getch()
                if ch == b"1":
                    _abbrev_event.set()
                    break
    except Exception:
        pass  # non-Windows / no console: leave the answer to finish


def stop_speaking_early() -> None:
    """Tell the player to stop as soon as it returns to the buffer loop."""
    _abbrev_event.set()


def reset_speaking_abort() -> None:
    """Clear the abort flag for the next turn."""
    _abbrev_event.clear()


def stop_speaking_early() -> None:
    """Alias kept for caller clarity (flag-set is the real effect)."""
    _abbrev_event.set()


def _translate_to_english(text: str) -> str:
    """Best-effort Gemini translation; empty string on any failure."""
    try:
        import os
        import requests as rq

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return ""
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-3.5-flash:generateContent?key={api_key}"
        )
        body = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": "Translate this to simple English for a "
                            "Text-to-Speech engine. Reply with ONLY the "
                            "translation:\n\n" + text[:2000]
                        }
                    ]
                }
            ]
        }
        r = rq.post(url, json=body, timeout=30)
        if r.status_code == 200:
            return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        pass
    return ""


if __name__ == "__main__":
    import sys

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    demos = {
        "te": "మా పంటకు ఏ పురుగు మందు వాడాలి?",
        "hi": "पीएम किसान योजना के लिए पात्रता क्या है?",
        "en": "PM Kisan gives 6000 rupees per year to eligible farmers.",
    }
    for lang, text in demos.items():
        print(f"speak({lang}) ->", speak(text, lang))
