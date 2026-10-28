# chat.py — POST /chat: RAG-grounded answers for the farmer chat UI.

import asyncio

from typing import Optional, Union
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from app.services import ai_service, chat_memory, multilang, rag_router, rag_service, voice_limit, tts_service

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    query: str = Field(
        ...,
        min_length=1,
        description="Farmer's question in Telugu, Hindi or English",
    )
    session_id: Optional[str] = Field(
        None,
        description="Client-generated session id; enables conversation memory "
        "(the session's last 3 exchanges become context) and the 24-hour "
        "response cache",
    )


class Source(BaseModel):
    """Retrieved chunk provenance; fields present depend on its kind."""

    kind: Optional[str] = None
    source: Optional[str] = None
    page: Optional[int] = None
    scheme: Optional[str] = None
    source_url: Optional[str] = None
    question: Optional[str] = None
    distance: Optional[float] = None


class ChatResponse(BaseModel):
    answer: str
    provider: str
    sources: list[Source]
    cached: bool = False
    sources_count: Optional[int] = Field(
        None,
        description="Provenance count for internal monitoring (equal to "
        "sources when verified, 0 when the answer was weakly supported by "
        "the retrieved chunks); carries no user-facing label",
    )


class _TtsRequest(BaseModel):
    text: str
    lang: str = Field(default="te", pattern="^te$")


class VoiceChatResponse(ChatResponse):
    transcribed_text: str
    detected_language: str = Field(
        ...,
        description="BCP code of the dominant language in the transcript "
        "('te' | 'hi' | 'en'; mixed Telugu+English reports 'te'). 'und' "
        "only when no transcription engine was available, so nothing could "
        "be detected",
    )


def _build_sources(hits: list[dict]) -> list[Source]:
    """Turn retrieved chunks into response sources, keeping only real fields."""
    return [
        Source(**{**hit["metadata"], "distance": hit["distance"]}).model_dump(
            exclude_none=True
        )
        for hit in hits
    ]


def _retrieve_with_router(
    query: str, session_id: str, top_k: int = 3
) -> tuple[list[dict], dict]:
    """Rule-based RAG-router retrieval for one turn (Stage 2).

    Decisions (no AI calls, microseconds of deterministic checks):
      (a) query transformation — short, vague or informal farmer wording gets
          an expanded retrieval variant alongside the original;
      (b) hybrid vs vector-only — exact tokens (percentages, acronyms,
          amounts) or long multi-constraint questions add BM25-lite keyword
          candidates to the vector pool;
      (c) reranking — when the top distances are too close to separate (or
          the best score is weak), keyword overlap re-orders the hits.

    Follow-up-prone sessions (recent history) retrieve with the original
    query kept first so "what about my crop" still lands near the topic.

    Returns (hits, decisions) — decisions is this turn's router log, kept
    for ops/debug and echoed in the test harness only.
    """
    decisions = rag_router.route(query)
    queries = decisions["expand_queries"]
    hybrid = decisions["hybrid"]

    if chat_memory.get_recent_turns(session_id):
        # Session has history: keep the raw query first (session context is
        # provided to the model separately; retrieval stays topic-first).
        decisions["session_context"] = True

    hits = rag_service.retrieve(queries, top_k=top_k, hybrid=hybrid)

    if decisions["rerank"]:
        before = [h.get("text", "")[:40] for h in hits]
        hits = rag_service.rerank_results(query, hits)
        decisions["rerank_changed_order"] = (
            before != [h.get("text", "")[:40] for h in hits]
        )
    decisions["hybrid_used"] = hybrid
    return hits, decisions


def _answer_turn(
    question: str,
    session_id: str,
    pre_searched: bool = False,
    pre_searched_hits: Optional[list[dict]] = None,
) -> tuple[str, str, list[dict], bool, dict, dict]:
    """One chat turn's full pipeline, shared by /chat and /chat/voice.

    1. Cache: exact/near-identical question answered < 24h ago -> that answer
       directly, with no retrieval and no AI call.
    2. Retrieval through the rule-based RAG router (or reuse the caller's
       pre-searched hits, e.g. the voice endpoint after transcription).
    3. Conversation memory: the session's last 3 Q/A pairs go to the model
       as extra context for follow-ups.
    4. AI rotation: ai_service.generate_answer (provider order unchanged).
       The answer is verified against the retrieved chunks and then written
       into the cache and session history.

    Returns (answer, provider, hits, cache_hit, verification, decisions).
    verification is {} on cache hits; decisions is the router log.
    """
    text = question.strip()

    # 1. Response cache — no retrieval, no AI call on a hit.
    cached = chat_memory.get_cached_answer(text)
    if cached.hit:
        print(f"[chat] cache hit ({cached.age_hours:.1f}h old); no AI call")
        return cached.answer, "cache", [], True, {}, {"note": "cache hit"}

    # 2. Retrieval (routed), or reuse pre-searched hits as-is.
    if pre_searched:
        hits = list(pre_searched_hits or [])
        decisions = {"note": "hits pre-searched by caller"}
    else:
        hits, decisions = _retrieve_with_router(text, session_id)

    # 3. Session memory: last 3 Q/A pairs for this session, oldest first.
    history_text = chat_memory.format_recent_turns(
        chat_memory.get_recent_turns(session_id)
    )

    # 4. Provider rotation (unchanged call signature/order).
    try:
        answer, provider = ai_service.generate_answer(text, hits, history_text)
    except Exception:
        # Unexpected provider exhaustion: propagate as-is (the route maps it
        # to HTTP 502 upstream) without masking the original traceback.
        raise

    # Answer verification (Stage 2): internal-only, no user-facing label.
    # The question is passed so question-echo tokens can't fake grounding.
    verification = rag_router.verify_answer(answer, hits, question=text)
    if not verification["supported"]:
        print(
            f"[chat] answer verification weak: overlap="
            f"{verification['overlap_ratio']} supporting_chunks="
            f"{verification['supporting_chunks']}"
        )
    else:
        # Positive counterpart so EVERY generated turn logs its grounding
        # verdict explicitly (a missing line is no longer ambiguous).
        print(
            f"[chat] answer verified grounded: overlap="
            f"{verification['overlap_ratio']} supporting_chunks="
            f"{verification['supporting_chunks']}"
        )

    # Cache + remember the turn only after a successful generation.
    chat_memory.store_cached_answer(text, answer, provider)
    chat_memory.record_turn(session_id, text, answer)
    return answer, provider, hits, False, verification, decisions


@router.post("", response_model=ChatResponse, response_model_exclude_none=True)
def chat(req: ChatRequest):
    """Answer a farmer's question through the Stage-2 RAG pipeline.

    Cache-first: identical/near-identical questions inside 24 hours return
    the previous answer with no retrieval and no AI call. Otherwise the
    rule-based router picks the retrieval strategy, the 5-provider rotation
    generates the answer with the session's recent turns as context, and the
    result is verified against the retrieved chunks (internal flag only).
    """
    answer, provider, hits, cache_hit, verification, _ = _answer_turn(
        req.query,
        (req.session_id or "").strip(),
    )
    verified = verification.get("supported", True)
    return ChatResponse(
        answer=answer,
        provider=provider,
        sources=[] if cache_hit else _build_sources(hits),
        cached=cache_hit,
        sources_count=len(hits) if (verified and not cache_hit) else (
            None if cache_hit else 0
        ),
    )


@router.post("/tts", response_model=None)
async def tts_generate(req: _TtsRequest) -> Response:
    """Generate Telugu TTS audio from text (telugu-only).

    Frontend: the Telugu language-selection button uses this instead of the
    Web Speech API. Returns a WAV audio payload the browser can play with
    the Audio API.
    """
    try:
        audio_bytes = tts_service.generate_tts_audio(req.text, req.lang)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(content=audio_bytes, media_type="audio/wav", headers={
        "Content-Disposition": "attachment; filename=\"tts.wav\"",
    })


@router.post("/voice", response_model=VoiceChatResponse, response_model_exclude_none=True)
async def chat_voice(
    file: UploadFile = File(..., description="Recorded audio clip"),
    session_id: Optional[str] = Form(
        None,
        description="Client-generated session id for voice usage limiting and "
        "conversation memory (may also be sent as a query parameter)",
    ),
    session_id_param: Optional[str] = Query(
        None,
        alias="session_id",
        description="Same value as the session_id form field",
    ),
):
    """Transcribe a farmer's spoken question with Gemini, then answer it.

    Voice turns are soft-limited per session_id: a clip longer than 60 seconds
    is rejected, and a session that has used 5 minutes of total voice time
    gets HTTP 429 with a retry_after_seconds hint (usage resets after a
    15-minute cooldown). Both checks run before Gemini is called, so rejected
    turns cost no transcription API calls. The raw audio goes to Gemini's
    multimodal model for transcription; the transcript then goes through the
    same response cache + routed RAG retrieval + provider rotation as /chat.
    """
    sid = (session_id_param or session_id or "").strip()
    if not sid:
        raise HTTPException(
            status_code=422,
            detail="session_id is required (send it as a query parameter "
            "or form field)",
        )

    try:
        voice_limit.check_session(sid)
    except voice_limit.SessionQuotaExhaustedError as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "message": str(exc),
                "retry_after_seconds": exc.retry_after_seconds,
            },
        ) from exc

    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty")
    try:
        mime_type = ai_service.resolve_audio_mime_type(file.content_type, file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc

    duration = voice_limit.estimate_audio_duration(audio, mime_type)
    try:
        voice_limit.check_turn_duration(duration)
    except voice_limit.TurnTooLongError as exc:
        raise HTTPException(
            status_code=413,
            detail={
                "message": str(exc),
                "max_seconds": voice_limit.TURN_CAP_SECONDS,
                "audio_seconds_estimated": round(duration, 1),
            },
        ) from exc

    try:
        # Gemini STT is a blocking HTTP call: run it on a worker thread so
        # the event loop keeps serving /hardware/status & /presence/status.
        transcript = await asyncio.to_thread(
            ai_service.transcribe_audio, audio, mime_type
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if transcript == ai_service._TEXT_ONLY_MARKER:
        # No transcription engine available (quota exhausted on both Gemini
        # and Groq Whisper): do NOT run the answer pipeline on the marker
        # string itself — ask the farmer to type instead. Usage is not
        # recorded because no successful transcription happened.
        return VoiceChatResponse(
            transcribed_text=transcript,
            detected_language="und",
            answer=(
                "Voice input is unavailable right now due to high demand. "
                "Please type your question instead."
            ),
            provider="degraded",
            sources=[],
            cached=False,
            sources_count=0,
        )

    # Count usage only after a successful transcription.
    voice_limit.record_usage(sid, duration)

    # RAG answer: the whole pipeline (routed retrieval, provider rotation,
    # cache write) is blocking CPU/API work, so it runs on a worker thread
    # and the event loop stays free for /hardware/status and /presence/status.
    answer, provider, hits, cache_hit, verification, _ = await asyncio.to_thread(
        _answer_turn, transcript, sid
    )
    verified = verification.get("supported", True)
    return VoiceChatResponse(
        transcribed_text=transcript,
        detected_language=multilang.preferred_language(transcript)[0],
        answer=answer,
        provider=provider,
        sources=[] if cache_hit else _build_sources(hits),
        cached=cache_hit,
        sources_count=len(hits) if (verified and not cache_hit) else (
            None if cache_hit else 0
        ),
    )
