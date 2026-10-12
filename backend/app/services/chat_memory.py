# chat_memory.py — response cache + short conversation memory for /chat,
# stored in plain SQLite (no ORM) alongside the grievances DB.
#
# Response cache: before the AI rotation runs, look up the farmer's question
# (exact, or near-identical after light normalization) and return the stored
# answer if it is under CACHE_TTL_HOURS old — saves rate-limited provider
# calls on repeated/duplicate questions. Stored answers are never refreshed
# after ingestion.
#
# Conversation memory: the last MEMORY_LAST_N question+answer pairs per
# session_id are kept in sqlite so follow-ups like "how much money do I get"
# ("...for PM-KISAN?") can be answered with context. The recent turns are
# rendered as compact history lines and handed to build_prompt() as extra
# context beside the retrieved chunks.

import contextlib
import sqlite3
import threading
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

# chat_memory.py -> services/ -> app/ -> backend/
DB_PATH = Path(__file__).resolve().parents[2] / "app.db"

MEMORY_LAST_N = 3
CACHE_TTL_HOURS = 24
MAX_CACHE_ANSWER_LENGTH = 4000
MAX_HISTORY_ITEM_LENGTH = 300

_lock = threading.Lock()

_SCHEMA = """
CREATE TABLE IF NOT EXISTS chat_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    normalized_question TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_cache_norm_q
    ON chat_cache (normalized_question, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_history_session
    ON chat_history (session_id, id DESC);
"""


def _connect() -> sqlite3.Connection:
    """Open the app.db connection with chat tables ensured, rows as dicts.

    row_factory = sqlite3.Row gives dict-style column access on every lazy
    connection. WAL lets /chat and /grievance overlap on the same app.db.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.executescript(_SCHEMA)
    conn.commit()
    return conn


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def gc_expired() -> None:
    """Delete cache rows older than the TTL. Cheap: runs on each write."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)).isoformat(
        timespec="seconds"
    )
    with contextlib.closing(_connect()) as conn, _lock:
        conn.execute("DELETE FROM chat_cache WHERE created_at < ?", (cutoff,))
        conn.commit()  # implicit transaction would roll back on close


def clear_all() -> None:
    """Test/demo helper: empty both tables."""
    with contextlib.closing(_connect()) as conn, _lock:
        conn.execute("DELETE FROM chat_cache")
        conn.execute("DELETE FROM chat_history")
        conn.commit()


def _parse_timestamp(value: str | sqlite3.Row | bytes) -> datetime:
    """Convert a stored created_at into an aware datetime (hausenbot-proof)."""
    try:
        parsed = datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return datetime.min.replace(tzinfo=timezone.utc)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _qc_normalize(question: str) -> str:
    """Light question normalization for near-identical matching.

    Lowercases, collapses whitespace, strips decorative punctuation so that
    punctuation or spacing differences don't duplicate cache misses.
    """
    q = question.lower().strip()
    q = re.sub(r"\s+", " ", q)
    q = re.sub(r"[?!.,;:\"'`]+", "", q)
    q = re.sub(r"\s+", " ", q).strip()
    return q


# ---------------------------------------------------------------------------
# Response cache
# ---------------------------------------------------------------------------

class CacheLookup:
    """Result of a cache lookup: hit, stale/expired, or empty."""

    def __init__(self, answer: str | None, provider: str | None, age_hours: float | None):
        self.answer = answer
        self.provider = provider
        self.age_hours = age_hours

    @property
    def hit(self) -> bool:
        return self.answer is not None


def get_cached_answer(question: str) -> CacheLookup:
    """Return the cached answer for this exact or near-identical question.

    Only answers under CACHE_TTL_HOURS old count as a hit; older entries are
    expired and treated as a miss (they are garbage-collected lazily).
    """
    key = _qc_normalize(question)
    if not key:
        return CacheLookup(None, None, None)
    cutoff_iso = (
        datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
    ).isoformat(timespec="seconds")
    with contextlib.closing(_connect()) as conn, _lock:
        row = conn.execute(
            "SELECT question, answer, provider, created_at FROM chat_cache "
            "WHERE normalized_question = ? AND created_at >= ? "
            "ORDER BY created_at DESC LIMIT 1",
            (key, cutoff_iso),
        ).fetchone()
    if row is None:
        return CacheLookup(None, None, None)
    age_hours = max(
        0.0,
        (
            datetime.now(timezone.utc) - _parse_timestamp(row["created_at"])
        ).total_seconds()
        / 3600,
    )
    return CacheLookup(str(row["answer"]), str(row["provider"] or ""), age_hours)


def store_cached_answer(question: str, answer: str, provider: str = "") -> None:
    """Remember this question/answer pair for near-identical future questions.

    Re-running the same question replaces the previous row, keeping the
    freshest answer per normalized question.
    """
    q = question.strip()
    a = answer.strip()
    if not q or not a:
        return
    a = a[:MAX_CACHE_ANSWER_LENGTH]
    with contextlib.closing(_connect()) as conn, _lock:
        conn.execute(
            "INSERT INTO chat_cache (normalized_question, question, answer, provider, "
            "created_at) VALUES (?, ?, ?, ?, ?)",
            (_qc_normalize(q), q, a, provider or "", _utc_now()),
        )
        conn.commit()  # implicit transaction would roll back on close


# ---------------------------------------------------------------------------
# Conversation memory
# ---------------------------------------------------------------------------

def get_recent_turns(session_id: str, n: int = MEMORY_LAST_N) -> list[dict]:
    """Return the last n exchanges for this session, oldest first.

    Each item is {"question", "answer"}; empty list for a new/unknown session.
    """
    sid = (session_id or "").strip()
    if not sid:
        return []
    with contextlib.closing(_connect()) as conn, _lock:
        rows = conn.execute(
            "SELECT question, answer FROM chat_history "
            "WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (sid, n),
        ).fetchall()
    return [{"question": r["question"], "answer": r["answer"]} for r in reversed(rows)]


def record_turn(session_id: str, question: str, answer: str) -> None:
    """Append a question/answer exchange to the session's history.

    Keeps the table's per-session rows bounded by pruning earlier rows beyond
    MEMORY_LAST_N so the DB cannot grow without limit.
    """
    sid = (session_id or "").strip()
    q = (question or "").strip()
    a = (answer or "").strip()[:MAX_HISTORY_ITEM_LENGTH]
    if not sid or not q or not a:
        return
    with contextlib.closing(_connect()) as conn, _lock:
        conn.execute(
            "INSERT INTO chat_history (session_id, question, answer, created_at) "
            "VALUES (?, ?, ?, ?)",
            (sid, q, a, _utc_now()),
        )
        conn.execute(
            "DELETE FROM chat_history WHERE session_id = ? AND id NOT IN ("
            "  SELECT id FROM chat_history WHERE session_id = ?"
            "  ORDER BY id DESC LIMIT ?)",
            (sid, sid, MEMORY_LAST_N),
        )
        conn.commit()  # implicit transaction would roll back on close


def format_recent_turns(turns: list[dict]) -> str:
    """Render recent session turns as compact context lines for the prompt.

    One "Q:/A:" pair per earlier exchange, truncated to MAX_HISTORY_ITEM_LENGTH
    so the prompt does not bloat; empty string when there is no history.
    """
    lines = []
    for turn in turns:
        q = turn["question"][:MAX_HISTORY_ITEM_LENGTH]
        a = turn["answer"][:MAX_HISTORY_ITEM_LENGTH]
        lines.append(f"Q: {q}\nA: {a}")
    return "\n".join(lines)


def _connect_for_testing() -> sqlite3.Connection:
    """Direct connection for tests (less indirection than _connect())."""
    return _connect()
