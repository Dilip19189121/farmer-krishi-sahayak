# tts_service.py — HTTP TTS for Telugu (te-IN) only.
#
# The browser-side Telugu button no longer uses the Web Speech API. Instead it
# posts `text` + `lang=te` to POST /chat/tts and plays the returned audio via
# the browser Audio API. English and Hindi still use the browser voices, so
# this service is deliberately telugu-only.
#
# Pipeline mirrors the existing offline TTS: gTTS (needs internet) -> WAV in
# memory -> returned to the caller. No audio file is persisted on disk.

from __future__ import annotations

import io
import wave
from typing import Optional

from gtts import gTTS


def generate_tts_audio(text: str, lang: str = "te") -> bytes:
    """Return WAV audio bytes for `text` in `lang` (Telugu only)."""
    if lang != "te":
        raise ValueError(f"Unsupported TTS language: {lang!r} (telugu only)")

    buf = io.BytesIO()
    gTTS(text=text, lang="te", tld="com").write_to_fp(buf)
    buf.seek(0)

    # Write a proper 16-bit PCM WAV container around the gTTS output.
    raw = buf.read()
    wav = io.BytesIO()
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframesraw(raw)
    return wav.getvalue()
