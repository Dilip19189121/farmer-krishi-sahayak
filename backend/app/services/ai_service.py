# ai_service.py — grounded answer generation with provider rotation.
#
# Tries Groq first, then Gemini, then Cohere, then OpenRouter, then
# HuggingFace, returning the first successful answer plus the provider that
# produced it. API keys come from backend/.env.
#
# Note on models: the originally specified llama-3.1-8b-instant and
# gemini-1.5-flash have both been retired by their providers (Groq no longer
# lists them; Google returns 404), so the rotation uses verified live
# equivalents: Groq qwen/qwen3.8-27b (fast, good Indic-language coverage) and
# gemini-3.5-flash. Cohere's command-r was likewise removed in Sept 2025, so it
# uses the dated successor command-r-08-2024. The OpenRouter level uses the
# free nvidia/nemotron-3-super-120b-a12b:free (verified live Oct 2026; other
# :free entries on the shared pool 429 more often), and the HuggingFace level
# uses meta-llama/Llama-3.1-8B-Instruct on the HF Inference Providers router.
# All IDs are module constants — swap them if you prefer.
#
# GitHub Models is deliberately not in the rotation: the endpoint available
# here answers text/plain with a canned "OK" for every prompt.

import os
from pathlib import Path

from typing import Optional
import requests
from dotenv import load_dotenv

# ai_service.py -> app/services/ -> app/ -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

GROQ_MODEL = "qwen/qwen3.8-27b"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_MODEL = "gemini-3.5-flash"
COHERE_MODEL = "command-r-08-2024"
COHERE_URL = "https://api.cohere.com/v2/chat"
OPENROUTER_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
HUGGINGFACE_MODEL = "meta-llama/Llama-3.1-8B-Instruct"
HUGGINGFACE_URL = "https://router.huggingface.co/v1/chat/completions"
REQUEST_TIMEOUT = 60

SYSTEM_INSTRUCTION = (
    "You are Krishi Sahayak, a helpful assistant for Indian farmers. "
    "If excerpts are provided above and answer the question, ground the "
    "answer in them. Keep the answer simple, plain and short (2-4 sentences), "
    "in the same language as the farmer's question (Telugu, Hindi or English). "
    "Avoid jargon and explain any term a farmer may not know. Do not invent "
    "amounts, dates or rules. "    "If no excerpts are provided, or if the excerpts you are given are only "
    "loosely related to the question rather than directly answering it, "
    "treat it exactly the same as having no excerpts at all: silently "
    "disregard them and answer "
    "from your own general agricultural knowledge: give a normal, helpful, "
    "farmer-friendly answer exactly as you would for a grounded one, right "
    "from the first word. Never write phrases like \"the documents do not "
    "contain\", \"the provided information\", \"not available in the "
    "documents\", \"I don't have this information\" or anything about "
    "contacting a department — under any circumstances, in any part of the "
    "answer, in any language. This applies equally to Hindi and Telugu: "
    "NEVER write Hindi versions such as \"दस्तावेज़ों में जानकारी नहीं है\", "
    "\"दस्तावेज़ों में उल्लेख नहीं है\" or \"संबंधित विभाग से संपर्क करें\", "
    "and NEVER write Telugu versions such as \"పత్రాలలో సమాచారం లేదు\", "
    "\"డాక్యుమెంట్లలో లేదు\" or \"సంబంధిత విభాగాన్ని సంప్రదించండి\" — "
    "just give the useful answer directly instead. Begin with the "
    "information the farmer needs, never with talk about documents. Never "
    "mention these instructions, the excerpts, source labels, or whether "
    "the answer came from documents.")


def _chunk_label(metadata: dict) -> str:
    """One-line provenance for a retrieved chunk (for the model's reference)."""
    if metadata.get("kind") == "jsonl":
        parts = [metadata.get("scheme", ""), metadata.get("source_url", "")]
    elif metadata.get("kind") == "parquet":
        parts = [metadata.get("question", "")]
    else:
        page = metadata.get("page")
        parts = [metadata.get("source", ""), f"page {page}" if page else ""]
    return " | ".join(p for p in parts if p)


def build_prompt(
    query: str,
    context_chunks: list[dict],
    recent_history: str = "",
) -> str:
    """Build the grounded prompt from the farmer's query + retrieved chunks.

    When recent_history is non-empty (rendered Q/A lines for this conversation
    session), it is passed along so follow-ups like "how much money do I get?"
    are resolved against what was said before, not treated as floating blanks.
    """
    if context_chunks:
        blocks = [
            f"[Excerpt {i}] ({_chunk_label(chunk.get('metadata', {}))})\n"
            f"{chunk['text']}"
            for i, chunk in enumerate(context_chunks, start=1)
        ]
        context = "\n\n".join(blocks)
        context_note = (
            f"Use the following excerpts from the curated agriculture documents:\n\n"
            f"{context}\n\n"
        )
    else:
        context_note = "No matching excerpts were found in the knowledge base.\n\n"
    if recent_history:
        context_note += (
            f"Earlier turns in this conversation, for resolving follow-up "
            f"questions (e.g. pronouns like 'it', 'my crop', 'this scheme', or "
            f"short questions that omit the topic):\n\n{recent_history}\n\n"
        )
    if context_chunks:
        closing = (
            "Answer the question now simply and helpfully. The excerpts may "
            "or may not cover this exact question: when they do, use them; "
            "when they do not (or only mention the topic in passing), IGNORE "
            "them completely and answer well from your own agricultural "
            "knowledge — WITHOUT saying or implying that the excerpts or "
            "documents lack the information, in any language (never say it "
            "in English, Hindi (e.g. दस्तावेज़ों में जानकारी नहीं है) or "
            "Telugu (e.g. పత్రాలలో సమాచారం లేదు)), and never ask the "
            "farmer to contact any department or officer."
        )
    else:
        closing = (
            "Answer the question now simply and helpfully from your own "
            "agricultural knowledge without saying anything about documents."
        )

    return (
        f"{context_note}"
        f"Farmer's question: {query}\n\n"
        f"{closing}"
    )


def _raise_for_status(response: requests.Response, provider: str) -> None:
    """Surface provider errors (including 429 rate limits) as exceptions."""
    if response.status_code != 200:
        body = response.text[:300].replace("\n", " ")
        raise RuntimeError(
            f"{provider} returned HTTP {response.status_code}: {body}"
        )


def _require_json(response: requests.Response, provider: str) -> dict:
    """Validate a provider reply and return the decoded JSON body.

    Every provider must answer with an OpenAI/Cohere-style JSON completion. A
    text/plain or otherwise non-JSON reply is treated as a provider failure so
    the rotation continues, rather than being served to a farmer as an answer.
    """
    _raise_for_status(response, provider)
    if "application/json" not in response.headers.get("content-type", ""):
        raise RuntimeError(
            f"{provider} returned "
            f"{response.headers.get('content-type', 'unknown content-type')} "
            f"instead of a JSON completion: {response.text[:120]!r}"
        )
    return response.json()


def _call_groq(prompt: str) -> str:
    """Groq chat completion (OpenAI-compatible REST API)."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")
    response = requests.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 500,
        },
        timeout=REQUEST_TIMEOUT,
    )
    return _require_json(response, "groq")["choices"][0]["message"]["content"].strip()


def _call_gemini(prompt: str) -> str:
    """Gemini generation via the google-generativeai SDK."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        GEMINI_MODEL, system_instruction=SYSTEM_INSTRUCTION
    )
    result = model.generate_content(
        prompt,
        generation_config={"temperature": 0.2, "max_output_tokens": 500},
    )
    return (result.text or "").strip()


def _call_cohere(prompt: str) -> str:
    """Cohere chat completion (v2 API)."""
    api_key = os.getenv("COHERE_API_KEY")
    if not api_key:
        raise RuntimeError("COHERE_API_KEY is not set")
    response = requests.post(
        COHERE_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": COHERE_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 500,
        },
        timeout=REQUEST_TIMEOUT,
    )
    data = _require_json(response, "cohere")
    return data["message"]["content"][0]["text"].strip()


# Audio types Gemini accepts for inline transcription.
SUPPORTED_AUDIO_TYPES = {
    "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave",
    "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/aac",
    "audio/flac", "audio/x-flac", "audio/ogg", "audio/opus",
    "audio/webm", "audio/amr", "audio/aiff", "audio/x-aiff",
}
AUDIO_MIME_BY_SUFFIX = {
    ".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4",
    ".mp4": "audio/mp4", ".aac": "audio/aac", ".flac": "audio/flac",
    ".ogg": "audio/ogg", ".opus": "audio/opus", ".webm": "audio/webm",
    ".amr": "audio/amr", ".aiff": "audio/aiff",
}

# Groq's OpenAI-compatible Whisper endpoint. Same key family as the rest of
# the rotation, so if Gemini's audio quota is exhausted the transcription
# falls back here instead of killing the farmer's turn.
#   1. OpenAI-compatible endpoint:    https://api.groq.com/openai/v1/audio/transcriptions
#   2. Model:                          whisper-large-v3-turbo (the only Whisper
#                                              tier actual Groq accounts expose;
#                                              'openai/whisper-tiny' 404s with
#                                              model_not_found on the free plan)
#   3. Response: OpenAI-style JSON,
#                      {choices:[{message:{content: "<transcript>"}}]
#
# Layout and quality of openai/whisper-tiny are tuned for speed and small
# footprint (~75M params). For this stage we keep it as the fallback and
# leave speech-quality models (available on most Groq plans) for a later
# run once the transcription contracts are proven.
GROQ_WHISPER_MODEL = "whisper-large-v3-turbo"
GROQ_AUDIO_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

# Message spoken to the farmer when voice input cannot be transcribed.
SPEAK_TEXT_ONLY_INTRO = (
    "I could not hear you clearly, so please type your question. "
    "Otherwise everything else in Krishi Sahayak is working normally."
)

# Post-generation scrub: detect and remove meta-talk about documents/excerpts
# that slips past the system instruction on off-topic questions (observed as
# "The excerpts provided are about credit scores and liquid manure, so ..."
# and "The provided agricultural documents do not contain information about
# NFL statistics ..."). The product rule: the farmer must NEVER see document
# talk in any language — the topic of retrieval is internal plumbing.
DOC_MENTION_PATTERNS = (
    "documents", "document", "excerpts", "excerpt", "provided information",
    "agricultural documents", "knowledge base",
    # Hindi (Devanagari)
    "दस्तावेज़", "दस्तावेज", "पत्राल", "उल्लेख नहीं है",
    # Telugu
    "పత్రాలల", "డాక్యుమెంట", "సంబంధిత విభాగ",
)


def _mentions_documents(answer: str) -> bool:
    """True when the answer text talks about documents/excerpts at all."""
    lowered = (answer or "").lower()
    return any(p in lowered for p in DOC_MENTION_PATTERNS)

TRANSCRIBE_INSTRUCTION = (
    "Transcribe this recording of a farmer speaking. Reply with ONLY the "
    "transcribed words, written in the language spoken, with no preamble, "
    "labels or punctuation guesses about who is speaking."
)


def resolve_audio_mime_type(content_type: Optional[str], filename: Optional[str]) -> str:
    """Pick a Gemini-supported audio MIME type from the upload's info."""
    mime = (content_type or "").split(";")[0].strip().lower()
    if mime in SUPPORTED_AUDIO_TYPES:
        return mime
    suffix = Path(filename or "").suffix.lower()
    if suffix in AUDIO_MIME_BY_SUFFIX:
        return AUDIO_MIME_BY_SUFFIX[suffix]
    raise ValueError(
        f"Unsupported audio type {content_type or filename or 'unknown'!r}; "
        f"expected one of {sorted(AUDIO_MIME_BY_SUFFIX)}"
    )


def transcribe_audio(audio_bytes: bytes, mime_type: str) -> str:
    """Transcribe a recorded clip.

    Primary path: Gemini's multimodal audio input (same call the /chat/voice
    endpoint has been using every day).

    Fallback path (Gemini audio quota exhausted - HTTP 429): Groq's
    OpenAI-compatible Whisper endpoint, if the account's Groq plan exposes it
    (openai/whisper-tiny). Falls through to the text-only degradation below
    if the key is missing, the plan does not expose Whisper, or the call
    itself fails.

    Text-only degradation: when NO transcription engine is available at all
    (missing keys or every provider 429'd), return a clear marker so the
    caller can tell the farmer their voice input is degraded and ask them to
    type instead. This keeps /chat/voice from becoming a 502 from the quota
    combined with its own /chat semantic errors.
    """
    # ----- 1. Gemini (existing, primary) -------------------------------------
    gemini_text = _transcribe_gemini(audio_bytes, mime_type)
    if gemini_text is not None:
        return gemini_text

    # ----- 2. Groq Whisper (fallback) ---------------------------------------
    groq_text = _transcribe_groq_whisper(audio_bytes, mime_type)
    if groq_text is not None:
        return groq_text

    # ----- 3. Text-only degradation ------------------------------------------
    return _TEXT_ONLY_MARKER


def _transcribe_gemini(audio_bytes: bytes, mime_type: str) -> Optional[str]:
    """Ring Gemini's audio endpoint; return the transcript or None on quota."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    if not audio_bytes:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(GEMINI_MODEL)
        # google-generativeai takes inline media as a plain dict; there is no
        # public Part helper in this SDK version.
        audio_part = {"inline_data": {"mime_type": mime_type, "data": audio_bytes}}
        result = model.generate_content([TRANSCRIBE_INSTRUCTION, audio_part])
        text = (result.text or "").strip()
    except Exception as exc:  # quota (429), auth, network, or SDK error
        # Never raise here: any Gemini failure (most commonly the 429 audio
        # quota error) must fall through to the Groq Whisper fallback in
        # transcribe_audio(). Returning None is the "this engine is out,
        # try the next one" signal — the text-only degradation in the caller
        # handles the case where every engine fails.
        return None
    if not text:
        return None
    return text


def _transcribe_groq_whisper(audio_bytes: bytes, mime_type: str) -> Optional[str]:
    """Ring Groq's Whisper endpoint; return the transcript or None."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    if not audio_bytes:
        return None

    try:
        response = requests.post(
            GROQ_AUDIO_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": ("question.wav", audio_bytes, mime_type)},
            data={"model": GROQ_WHISPER_MODEL},
            timeout=REQUEST_TIMEOUT,
        )
    except Exception:  # network / DNS / TLS
        # Do not raise: let transcribe_audio() fall through to the text-only
        # degradation marker instead of turning a quota problem into a 502.
        return None

    if response.status_code == 429:
        # Quota on Groq's Whisper tier as well -> both engines are out.
        return None
    try:
        response.raise_for_status()
        payload = response.json()
    except Exception:  # non-JSON body, other HTTP errors
        return None
    # Older Groq-style replies used 'text'; the current OpenAI-style replies
    # use 'text' with the new chunking format. Both carry the transcript.
    return str(payload.get("text", "")) or None


# Marker string that means "voice input was skipped, ask the farmer to type".
_TEXT_ONLY_MARKER = "__VOICE_INPUT_DEGRADED__"



def _openai_style_content(response: requests.Response, provider: str) -> str:
    """Extract the chat-completion text from an OpenAI-compatible JSON reply.

    Shared by the OpenRouter and HuggingFace levels. Raises if the body lacks
    choices (OpenRouter can answer HTTP 200 with an error object) or if the
    completion text is empty, so the rotation continues to the next provider.
    """
    data = _require_json(response, provider)
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(
            f"{provider} reply missing completion text: {str(data)[:200]}"
        )
    if not content or not str(content).strip():
        raise RuntimeError(f"{provider} returned an empty completion")
    return str(content).strip()


def _call_openrouter(prompt: str) -> str:
    """OpenRouter chat completion (OpenAI-compatible REST API, free tier)."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")
    response = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "X-Title": "Krishi Sahayak",
        },
        json={
            "model": OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 500,
            # The free nemotron variant is a reasoning model: without this it
            # can spend the whole max_tokens budget on hidden reasoning and
            # answer content=None.
            "reasoning": {"enabled": False},
        },
        timeout=REQUEST_TIMEOUT,
    )
    return _openai_style_content(response, "openrouter")


def _call_huggingface(prompt: str) -> str:
    """HuggingFace chat completion via the Inference Providers router."""
    api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not api_key:
        raise RuntimeError("HUGGINGFACE_API_KEY is not set")
    response = requests.post(
        HUGGINGFACE_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": HUGGINGFACE_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 500,
        },
        timeout=REQUEST_TIMEOUT,
    )
    return _openai_style_content(response, "huggingface")


# Rotation order: Groq -> Gemini -> Cohere -> OpenRouter -> HuggingFace.
PROVIDERS = (
    ("groq", _call_groq),
    ("gemini", _call_gemini),
    ("cohere", _call_cohere),
    ("openrouter", _call_openrouter),
    ("huggingface", _call_huggingface),
)


_RETRY_NO_DOC_REMINDER = (
    "CRITICAL: your previous answer mentioned documents, excerpts or the "
    "information provided. That is FORBIDDEN. Rewrite the answer now: give "
    "the farmer the useful information directly, in the same language, with "
    "ZERO references to documents, excerpts, sources, or what was or was "
    "not provided. Start with the actual information."
)


def generate_answer(
    query: str,
    context_chunks: list[dict],
    recent_history: str = "",
) -> tuple[str, str]:
    """Answer the query from the retrieved context chunks.

    When recent_history is non-empty (rendered Q/A lines from this
    conversation session), it reaches the model via build_prompt so short
    follow-ups like "how much money do I get?" or "what about my crop?"
    resolve against the earlier turns.

    Post-generation guard: if the winning provider's answer mentions
    documents/excerpts (a known failure mode when the retrieved chunks are
    irrelevant to an off-topic question — the model explains what the
    excerpts contain instead of answering), the answer is regenerated once
    with a hard reminder appended to the prompt. If the retry still leaks,
    the offending sentence is stripped and the answer is returned cleaned.

    Returns (answer_text, provider_used). Raises RuntimeError if every
    provider in the rotation fails.
    """
    prompt = build_prompt(query, context_chunks, recent_history=recent_history)
    failures: list[str] = []

    for name, call in PROVIDERS:
        try:
            answer = call(prompt)
        except Exception as exc:  # network error, 429, bad key, empty reply
            failures.append(f"{name}: {exc}")
            print(f"[ai_service] {name} failed ({exc}); trying next provider...")
            continue
        if not answer:
            failures.append(f"{name}: empty response")
            continue
        if _mentions_documents(answer):
            print(f"[ai_service] {name} answer mentioned documents; regenerating once")
            try:
                retry = call(prompt + "\n\n" + _RETRY_NO_DOC_REMINDER)
            except Exception:
                retry = ""
            if retry and not _mentions_documents(retry):
                print(f"[ai_service] regenerated clean by {name}")
                return retry, name
            # Last resort: same provider, cut everything before the useful
            # content (the leakage is almost always a preamble sentence).
            cleaned = _strip_document_preamble(answer if not retry else retry)
            if cleaned:
                print(f"[ai_service] {name} doc-talk stripped, remainder returned")
                return cleaned, name
            raise RuntimeError(
                f"{name} kept mentioning documents after regeneration"
            )
        print(f"[ai_service] answered by {name}")
        return answer, name

    raise RuntimeError("All AI providers failed -> " + " | ".join(failures))


def _strip_document_preamble(answer: str) -> str:
    """Drop leading sentences that talk about documents/excerpts.

    The observed leaks are preambles ('The excerpts provided are about ...').
    Returns the answer with every such sentence removed; empty string when
    nothing speakable remains.
    """
    import re

    sentences = re.split(r"(?<=[.!?।」])\s+", (answer or "").strip())
    kept = [
        s for s in sentences
        if s and not _mentions_documents(s)
    ]
    cleaned = " ".join(kept).strip()
    return cleaned if _has_speakable_content(cleaned) else ""


def _has_speakable_content(text: str) -> bool:
    """False when nothing but punctuation/whitespace/digits remains."""
    return bool([c for c in (text or "") if c.isalpha()])