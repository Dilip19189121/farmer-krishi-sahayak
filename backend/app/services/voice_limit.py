# voice_limit.py — in-memory per-session voice usage limiting for /chat/voice.
#
# No login is required: the client generates a session_id and sends it with
# each voice upload. Limits (all module constants, tuned for the demo):
#   - Per-turn cap: a single upload longer than TURN_CAP_SECONDS of audio is
#     rejected before it reaches Gemini, saving an API call.
#   - Session cap: once a session has used SESSION_CAP_SECONDS of total voice
#     time, further voice turns get HTTP 429 with a retry_after_seconds hint.
#   - Cooldown: COOLDOWN_SECONDS after the cap was hit, the session's usage
#     resets to 0 (applied lazily on the next request).
#
# State lives in a plain dict guarded by a lock — it survives for the
# lifetime of the uvicorn process and resets on restart, which is fine for
# demo soft-limiting (it is abuse protection, not billing).

import io
import threading
import time
import wave

TURN_CAP_SECONDS = 60
SESSION_CAP_SECONDS = 300  # 5 minutes of total voice per session
COOLDOWN_SECONDS = 900     # 15 minutes, counted from when the cap was hit

# Duration of compressed uploads (mp3/m4a/webm/ogg...) can't be read with the
# stdlib, so it is estimated from file size assuming this bitrate. It is set
# high on purpose (voice recordings are often 24-48 kbps opus, up to 128 kbps
# aac): overestimating duration would reject legitimate clips at the per-turn
# cap, while underestimating only means the quota is consumed a bit faster
# than reality. WAV uploads are measured exactly.
ESTIMATED_BITRATE_BPS = 64_000

SESSION_CAP_MESSAGE = (
    "Voice time used up for now - try typing, or come back in 15 minutes"
)

# session_id -> {"used_seconds": float, "capped_at": float | None}
# capped_at is a time.monotonic() stamp set when usage first crossed the cap.
_usage: dict[str, dict] = {}
_lock = threading.Lock()


class TurnTooLongError(ValueError):
    """A single voice upload exceeds TURN_CAP_SECONDS."""


class SessionQuotaExhaustedError(RuntimeError):
    """The session has used up its voice quota and is in cooldown."""

    def __init__(self, message: str, retry_after_seconds: int):
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


def estimate_audio_duration(data: bytes, mime_type: str) -> float:
    """Estimate audio duration in seconds from the raw upload bytes.

    WAV uploads are measured exactly; every other format is estimated from
    size at ESTIMATED_BITRATE_BPS. Never raises — a corrupt/unparseable WAV
    falls back to the size estimate.
    """
    if data and ("wav" in mime_type):
        try:
            with wave.open(io.BytesIO(data), "rb") as wav:
                framerate = wav.getframerate()
                if framerate:
                    return wav.getnframes() / framerate
        except Exception:  # wave.Error, EOFError, struct.error on bad files
            pass
    return len(data) * 8 / ESTIMATED_BITRATE_BPS


def check_session(session_id: str) -> None:
    """Allow a voice turn only if the session still has quota.

    Resets a cooled-down session to 0 usage. Raises
    SessionQuotaExhaustedError (with retry_after_seconds) when over the cap.
    """
    now = time.monotonic()
    with _lock:
        entry = _usage.setdefault(
            session_id, {"used_seconds": 0.0, "capped_at": None}
        )
        if entry["used_seconds"] < SESSION_CAP_SECONDS:
            return
        # The cap was hit. If the cooldown has elapsed, start fresh.
        if entry["capped_at"] is not None and (
            now - entry["capped_at"] >= COOLDOWN_SECONDS
        ):
            entry["used_seconds"] = 0.0
            entry["capped_at"] = None
            return
        elapsed = (
            COOLDOWN_SECONDS
            if entry["capped_at"] is None
            else now - entry["capped_at"]
        )
        raise SessionQuotaExhaustedError(
            SESSION_CAP_MESSAGE,
            retry_after_seconds=max(1, int(COOLDOWN_SECONDS - elapsed) + 1),
        )


def check_turn_duration(duration_seconds: float) -> None:
    """Reject a single voice upload longer than TURN_CAP_SECONDS."""
    if duration_seconds > TURN_CAP_SECONDS:
        raise TurnTooLongError(
            f"Voice clip is about {duration_seconds:.0f} seconds long. "
            f"Please keep recordings under {TURN_CAP_SECONDS} seconds "
            "(1 minute), or type your question instead."
        )


def record_usage(session_id: str, duration_seconds: float) -> None:
    """Add a successful turn's duration to the session's used time."""
    now = time.monotonic()
    with _lock:
        entry = _usage.setdefault(
            session_id, {"used_seconds": 0.0, "capped_at": None}
        )
        entry["used_seconds"] += max(0.0, duration_seconds)
        if (
            entry["used_seconds"] >= SESSION_CAP_SECONDS
            and entry["capped_at"] is None
        ):
            entry["capped_at"] = now  # cooldown starts when the cap is hit


def get_session_usage(session_id: str) -> dict:
    """Snapshot of one session's usage (for tests and debugging)."""
    with _lock:
        entry = _usage.get(session_id)
        if entry is None:
            return {"used_seconds": 0.0, "capped_at": None, "known": False}
        return {
            "used_seconds": entry["used_seconds"],
            "capped_at": entry["capped_at"],
            "known": True,
        }
