# auth_service.py — officer credential check and in-memory session tokens.
#
# MVP scope: one hardcoded officer account read from .env
# (OFFICER_USERNAME / OFFICER_PASSWORD). Tokens are random strings kept in
# process memory only, so they disappear on restart — acceptable for a
# single-process backend and deliberately not a JWT.

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv

# auth_service.py -> app/services/ -> app/ -> backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

SESSION_TTL = timedelta(hours=12)

# token -> {"username": str, "expires_at": datetime}
_sessions: dict[str, dict] = {}


def credentials_configured() -> bool:
    """Whether the officer account is set up in .env."""
    return bool(os.getenv("OFFICER_USERNAME") and os.getenv("OFFICER_PASSWORD"))


def authenticate_officer(username: str, password: str) -> bool:
    """Constant-time check against the single configured officer account.

    Fails closed: if the credentials are not configured, nobody can log in.
    """
    expected_user = os.getenv("OFFICER_USERNAME") or ""
    expected_password = os.getenv("OFFICER_PASSWORD") or ""
    if not expected_user or not expected_password:
        print(
            "[auth_service] WARNING: OFFICER_USERNAME/OFFICER_PASSWORD are not "
            "set in .env — officer login is disabled."
        )
        return False
    user_ok = secrets.compare_digest(username or "", expected_user)
    password_ok = secrets.compare_digest(password or "", expected_password)
    return user_ok and password_ok


def _purge_expired(now: datetime) -> None:
    for token in [t for t, s in _sessions.items() if s["expires_at"] <= now]:
        _sessions.pop(token, None)


def create_session(username: str) -> tuple[str, str]:
    """Issue a random session token; returns (token, expires_at ISO string)."""
    now = datetime.now(timezone.utc)
    _purge_expired(now)
    token = secrets.token_urlsafe(32)
    expires_at = now + SESSION_TTL
    _sessions[token] = {"username": username, "expires_at": expires_at}
    return token, expires_at.isoformat(timespec="seconds")


def validate_session(token: str) -> Optional[dict]:
    """Return the session for a valid, unexpired token, else None."""
    now = datetime.now(timezone.utc)
    _purge_expired(now)
    session = _sessions.get(token)
    if session is None or session["expires_at"] <= now:
        _sessions.pop(token, None)
        return None
    return session


def active_session_count() -> int:
    """How many sessions are currently valid (useful for debugging)."""
    _purge_expired(datetime.now(timezone.utc))
    return len(_sessions)