# multilang.py — language handling for the speech-to-speech test (Stage B).
#
# Standalone Stage (NOT wired into the FastAPI app: /chat and /chat/voice are
# untouched). Responsibilities, all lightweight:
#
#   1. detect_language(text)         Unicode-script counting -> ("te","hi","en")
#   2. normalize_transcript(text)    fix common STT slips for crop/scheme names
#                                    and numbers WITHOUT changing meaning
#   3. transcribe_with_language()    one Gemini call that returns BOTH the
#                                    transcript and a BCP-47 language code
#                                    (needs no separate detect step)
#
# Findings from the live investigation (Oct 2026):
#   - The existing ai_service.transcribe_audio() prompt asks for words only,
#     and Gemini returns no language information in that mode.
#   - The same Gemini multimodal call with an application/json response schema
#     ({transcript, language_code}) reliably returns both fields at once, so
#     no second detection pass is needed. Verified against real Telugu, Hindi,
#     and English audio (lang_ref_te/hi/en.wav): te-IN / hi-IN / en returned,
#     transcripts word-accurate.

import json
import os
import re
import unicodedata
from typing import Optional
from dotenv import load_dotenv
import requests

# multilang.py -> app/services/ -> backend/
load_dotenv(__import__("pathlib").Path(__file__).resolve().parents[2] / ".env")

GEMINI_TRANSCRIBE_MODEL = "gemini-3.5-flash"

# ---- 1. Script-based language detection -----------------------------------
# Unicode block ranges: Telugu 0C00-0C7F, Devanagari (Hindi) 0900-097F.
_SCRIPT_RANGES = {
    "te": (0x0C00, 0x0C7F),
    "hi": (0x0900, 0x097F),
}

# Confidence below this the transcript is treated as UNDETECTABLE (the kiosk
# then asks the farmer which language they want instead of guessing).
MIN_DETECT_CONFIDENCE = 0.6

# Words a farmer says when EXPLICITLY asking for a language change (whole
# utterance of a few words). Romanized + native-script spellings.
_SWITCH_KEYWORDS = {
    "te": ("తెలుగు", "తెలుగులో", "telugu", "telugu lo", "telugulo"),
    "hi": ("हिंदी", "hindi", "hindi mein", "हिंदी में"),
    "en": ("english", "ఇంగ్లీష్", "ఇంగ్లిష్", "अंग्रेजी", "अंग्रेज़ी", "inglish"),
}


def detect_language(text: str) -> tuple[str, float]:
    """Return (lang, confidence) from Unicode script counts, or ("en", 0).

    Latin letters count as English; Indic scripts as their own language
    whichever way the romanization goes. Confidence = share of the dominant
    script among all counted letters.
    """
    counts = {"te": 0, "hi": 0, "en": 0}
    for ch in text:
        o = ord(ch)
        for lang, (lo, hi) in _SCRIPT_RANGES.items():
            if lo <= o <= hi:
                counts[lang] += 1
                break
        else:
            if ch.isalpha() and o < 0x0900:  # ASCII/Latin-1 letters
                counts["en"] += 1
    data = {k: v for k, v in counts.items() if v > 0}
    if not data:
        return "en", 0.0
    lang = max(data, key=data.get)
    total = sum(data.values())
    return lang, data[lang] / total


def preferred_language(text: str) -> tuple[str, float]:
    """Session-facing language choice; Telugu wins Mixed te+en speech.

    Counting stays script-based, but when BOTH Telugu and Latin letters are
    present (a Telugu farmer mixing English words into their sentence), the
    dominant language is Telugu regardless of which script is slightly
    longer. Pure English (no Telugu/Devanagari) stays English.
    """
    counts = {"te": 0, "hi": 0, "en": 0}
    for ch in text:
        o = ord(ch)
        for lang, (lo, hi) in _SCRIPT_RANGES.items():
            if lo <= o <= hi:
                counts[lang] += 1
                break
        else:
            if ch.isalpha() and o < 0x0900:
                counts["en"] += 1
    if counts["te"] > 0:  # mixed Telugu+English -> prefer Telugu
        return "te", counts["te"] / max(1, counts["te"] + counts["hi"])
    data = {k: v for k, v in counts.items() if v > 0}
    if not data:
        return "en", 0.0
    lang = max(data, key=data.get)
    return lang, data[lang] / max(1, sum(data.values()))


def explicit_language_switch(text: str) -> Optional[str]:
    """The BCP language the farmer EXPLICITLY asked to switch to, or None.

    Whitespace-normalized keyword match, so 'speak in telugu please' or
    'హిందీలో చెప్పు' flip the session language without any model call.
    """
    norm = " ".join((text or"").lower().split())
    if not norm:
        return None
    for lang, words in _SWITCH_KEYWORDS.items():
        for word in words:
            if word in norm:
                return lang
    return None


# ---- 2. Lightweight transcript normalization ------------------------------
# Whole-word regex fixes for the STT slips we actually observed / plausibly
# get with Indian-accented speech around agriculture vocabulary. Applied in
# order; each replacement is short and meaning-preserving (canonical scheme /
# crop / number spellings). NOT a translation or rewrite layer.
_TOKEN_FIXES: tuple[tuple[str, str], ...] = (
    # Romanized question-word slips (echo/hearing 'What' as 'Which') —
    # meaning-preserving: e.g. 'Which is PM Kisan eligibility'
    (r"\bWhich\s+is\s+(PM\s*[Kk]isan|PMFBY)\b", r"What is \1"),
    # Scheme names
    (r"\bpm\s*kisan\b|\bpmkisan\b", "PM Kisan"),
    (r"\bpm\s*fby\b|\bpm f a b y\b|\bpmvy\b", "PMFBY"),
    (r"\bfasal\s*bima\b", "fasal bima"),
    (r"\bki\s*s[ao]n\b", "kisan"),
    # After the ki..san catch above: restore canonical "PM Kisan" casing
    (r"\bPM\s+kisan\b", "PM Kisan"),
    # Devanagari matra-loss slips observed from Gemini on noisy audio
    # ("कसान" → "किसा�न") — canonical scheme word only, whole-token.
    (r"(?<![\u0900-\u097F])कसान(?![\u0900-\u097F])", "किसान"),
    # Crop names: frequent ASR spellings
    (r"\btam[a]?to\b", "tomato"),
    (r"\bground\s*nut\b", "groundnut"),
    (r"\bsun\s*flower\b", "sunflower"),
    (r"\bblack\s*gram\b|\burud\b|\burad\b|\bmash\b", "black gram"),
    (r"\bgreen\s*gram\b|\bmoong\b|\bmung\b", "green gram"),
    (r"\bgram\s*chickpea\b|\bchenas?\b", "chickpea"),
    (r"\bco[tt]{2}on\b", "cotton"),
    (r"\bchilli\b|\bchilly\b", "chilli"),
    (r"\bmaiz[ez]\b", "maize"),
    (r"\bpadd[ye]y?\b", "paddy"),
    # Number-words farmers use in romanized Hindi/Telugu questions
    (r"\bdo\b\s*(?=(bigha|acre|ekad|hecta|rupee|hazar|rs\b))", "2 "),
    (r"\bteen\b\s*(?=(bigha|acre|ekad|hecta|rupee|hazar|rs\b))", "3 "),
    (r"\bpanch\b\s*(?=(bigha|acre|ekad|hecta|rupee|hazar|rs\b))", "5 "),
    (r"\b/d{6}\b", ""),  # stray digit-strings from noisy audio
)


# Backfiller filler words that a humid/echo clip produces; also covers
# romanized 'yes' answers. Kept tiny and additive-only (no deletion of real
# content) on purpose.
FILLER_WORDS = {
    "ah", "hmm", "um", "er", "haan", "ha", "ok", "okay",
    "theek", "ఏమండి", "హాయ్", "हाँ", "हूँ", "ya", "yes",
}


def normalize_transcript(text: str) -> tuple[str, list[str]]:
    """Apply the lightweight fixes; return (normalized_text, fixes_applied).

    Never reorders or invents words: only whole-token regex replacements and
    whitespace cleanup, so the answer pipeline sees the same question.
    """
    if not text:
        return "", []
    # NFKC folds some fullwidth/compat forms Gemini occasionally emits.
    text = unicodedata.normalize("NFKC", text)
    fixes: list[str] = []
    out = text
    for pattern, repl in _TOKEN_FIXES:
        new = re.sub(pattern, repl, out, flags=re.IGNORECASE)
        if new != out:
            fixes.append(f"{pattern[:24]}... -> {repl.strip()!r}")
            out = new
    out = re.sub(r"\s+", " ", out).strip()
    return out, fixes


def is_clear_transcript(normalized: str, min_chars: int = 3, min_words: int = 2,
                        min_lang_conf: float = 0.0) -> tuple[bool, str]:
    """Heuristic 'is this worth answering?' gate.

    Returns (ok, reason). Guards against empty/whisper/hum/noise clips that
    come back as 1-2 garbage syllables — the flow asks the farmer to repeat
    instead of guessing an answer from that. Fillers ('ah', 'hmm', 'haan')
    don't count as content words.
    """
    if not normalized or not normalized.strip():
        return False, "empty transcript"
    words = [
        w for w in normalized.split()
        if w.lower() not in FILLER_WORDS
    ]
    if not words:
        return False, "only filler words (ah/hmm/haan...)"
    if len(normalized) < min_chars or len(words) < min_words:
        return False, f"too short ({len(words)} content word(s))"
    lang, conf = detect_language(normalized)
    if conf < min_lang_conf:
        return False, f"low language confidence ({conf:.2f})"
    return True, f"ok lang={lang} conf={conf:.2f} words={len(words)}"


# ---- 3. Gemini transcription WITH language code ----------------------------
_JSON_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "transcript": {"type": "STRING"},
        "language_code": {
            "type": "STRING",
            "description": "BCP-47 code of the dominant spoken language, "
            "e.g. te-IN, hi-IN, en-IN or en.",
        },
    },
    "required": ["transcript", "language_code"],
}

_TRANSCRIBE_PROMPT = (
    "Transcribe this recording of a farmer speaking and detect the language. "
    "Return JSON with: transcript - the transcribed words, written in the "
    "language spoken, with no preamble or labels; language_code - the BCP-47 "
    "code of the dominant language spoken. If the audio is unclear, still "
    "give your best-effort transcript; do not add commentary."
)


def transcribe_with_language(audio_bytes: bytes, mime_type: str = "audio/wav") -> dict:
    """One Gemini multimodal call -> {"transcript", "language_code"} dict.

    Same audio + model the existing /chat/voice endpoint uses, but asked to
    also return the language in a constrained JSON body. Raises RuntimeError
    (missing key / empty audio / API error) like ai_service.transcribe_audio.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    if not audio_bytes:
        raise ValueError("audio is empty")

    import base64

    body = {
        "contents": [
            {
                "parts": [
                    {"text": _TRANSCRIBE_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(audio_bytes).decode("ascii"),
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": _JSON_SCHEMA,
        },
    }
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_TRANSCRIBE_MODEL}:generateContent?key={api_key}"
    )
    response = requests.post(url, json=body, timeout=60)
    if response.status_code != 200:
        raise RuntimeError(
            f"gemini transcribe_with_language failed: HTTP {response.status_code} "
            + response.text[:200]
        )
    data = response.json()
    try:
        payload = json.loads(data["candidates"][0]["content"]["parts"][0]["text"])
        return {"transcript": str(payload["transcript"]).strip(),
                "language_code": str(payload["language_code"]).strip() or "en"}
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise RuntimeError(
            f"gemini returned an unexpected body for transcribe: "
            f"{json.dumps(data, ensure_ascii=False)[:200]}"
        ) from exc


if __name__ == "__main__":
    import sys

    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    samples = [
        ("మా పంటకు ఏ పురుగు మందు వాడాలి?", "expect te"),
        ("पीएम किसान योजना क्या है?", "expect hi"),
        ("What is PM kisan eligibility", "expect en + PM Kisan fix"),
        ("tamato crop me panch hazar rupee", "fix tamato + numbers"),
        ("", "empty"),
        ("hmm ah", "too short"),
    ]
    for s, note in samples:
        lang, conf = detect_language(s)
        norm, fixes = normalize_transcript(s)
        gate, reason = is_clear_transcript(norm)
        print(f"{note!r:32} lang={lang}/{conf:.2f} norm={norm!r} fixes={fixes} gate={gate} ({reason})")
