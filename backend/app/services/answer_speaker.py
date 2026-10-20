# answer_speaker.py — speak the RAG answer in the farmer's language (Stage B).
#
# Standalone Stage (NOT wired into the FastAPI app). Priority order:
#   1. gTTS (Google Translate TTS voice) — good quality; needs internet.
#   2. pyttsx3 offline (en-only) — LAST RESORT: speaks English text
#      clearly; Indic scripts in Devanagari/Telugu are spelled out, which is
#      worse than switching the language of the reply, so it is only used
#      after an English translation attempt fails.
#
# Verified against round-trip Gemini STT for Telugu, Hindi, and English
# (see Stage-B test logs).

import io
import time
import wave
from pathlib import Path

# answer_speaker.py -> app/services/ -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]
OUT_DIR = BACKEND_DIR / "test_recordings"

# Language names for the returned note only.
LANG_NAME = {"te": "Telugu", "hi": "Hindi", "en": "English"}

# gTTS voices are matched by language code; zero configuration, no keys.
GTTIS_LANG = {"te": "te", "hi": "hi", "en": "en"}


def speak(text: str, lang: str = "en") -> dict:
    """Speak `text` aloud in `lang` using gTTS, then fall back to offline pyttsx3.

    Returns {"spoken_with": engine, "lang": lang, "wall_seconds": float,
             "note": why a step was skipped}. gTTS plays through the same
    Pygame/sounddevice-capable local decoder as the old edge-tts path.
    """
    start = time.monotonic()

    # 1. Google Translate TTS (needs internet).
    try:
        _play_gtts(text, lang)
        return {
            "spoken_with": f"gtts {lang}",
            "lang": lang,
            "wall_seconds": round(time.monotonic() - start, 1),
            "note": f"gTTS {LANG_NAME.get(lang, lang)}",
        }
    except Exception as exc:
        note = f"gtts failed: {type(exc).__name__}: {exc}"

    # 2. Offline pyttsx3: only useful for Latin-script text. For Telugu/
    #    Devanagari it spells out codepoints, which is worse than switching
    #    the language of the reply — so translate first, then read whatever
    #    is speakable.
    speakable = text
    if lang != "en":
        translated = _translate_to_english(text)
        if translated:
            speakable = translated

    try:
        from app.services import speech_io

        stats = speech_io.speak(speakable[:1200])
        return {
            "spoken_with": "pyttsx3 offline",
            "lang": "en",
            "wall_seconds": round(time.monotonic() - start, 1),
            "note": f"LAST RESORT offline English; {note}; tts stats: {stats}",
        }
    except Exception as exc:
        return {
            "spoken_with": "SILENT FAILURE",
            "lang": lang,
            "wall_seconds": round(time.monotonic() - start, 1),
            "note": f"no engine worked ({note}); offline failed: {exc}",
        }


def _play_gtts(text: str, lang: str) -> None:
    """Google Translate TTS -> local WAV -> Pygame playback."""
    from gtts import gTTS

    buf = io.BytesIO()
    gTTS(text=text, lang=GTTIS_LANG.get(lang, "en")).write_to_fp(buf)
    buf.seek(0)
    _play_wav_bytes(buf.getvalue())


def _play_wav_bytes(audio_bytes: bytes) -> None:
    """Decode WAV bytes and play them fully to the OS default output via Pygame."""
    import numpy as np
    import pygame
    import wave

    # Pygame's mixer accepts WAV directly; decode with the standard library.
    with wave.open(io.BytesIO(audio_bytes), "rb") as w:
        sr = w.getframerate()
        nch = w.getnchannels()
        sw = w.getsampwidth()
        frames = w.readframes(w.getnframes())
    if sw == 2:
        audio = np.frombuffer(frames, dtype=np.int16)
    else:
        audio = np.frombuffer(frames, dtype=np.uint8).astype(np.float32) / 255.0
    if nch > 1:
        audio = audio.reshape(-1, nch).mean(axis=1)
    audio = np.clip(audio, -1.0, 1.0).astype(np.float32)

    pygame.mixer.init()
    pygame.mixer.music.load(io.BytesIO(audio.tobytes()))
    pygame.mixer.music.play()
    # Block until playback finishes (matching the old edge-tts flavour).
    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)


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
