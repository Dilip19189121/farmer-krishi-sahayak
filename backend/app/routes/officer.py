# officer.py — officer login and the bearer-token guard for officer-only routes.

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.services import auth_service

router = APIRouter(prefix="/officer", tags=["officer"])

_BEARER = {"WWW-Authenticate": "Bearer"}

# auto_error=False so a missing header raises our own 401 (not FastAPI's 403)
# while still declaring the scheme in the OpenAPI docs / Swagger "Authorize".
bearer_scheme = HTTPBearer(
    auto_error=False, description="Officer session token from POST /officer/login"
)


class OfficerLogin(BaseModel):
    username: str
    password: str


class OfficerLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str


@router.post("/login", response_model=OfficerLoginResponse)
def officer_login(payload: OfficerLogin):
    """Exchange officer credentials for an in-memory session token."""
    if not auth_service.authenticate_officer(payload.username, payload.password):
        # Deliberately vague: never reveal whether username or password was wrong.
        raise HTTPException(
            status_code=401, detail="Invalid officer credentials", headers=_BEARER
        )
    token, expires_at = auth_service.create_session(payload.username)
    return OfficerLoginResponse(access_token=token, expires_at=expires_at)


def require_officer(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Dependency requiring `Authorization: Bearer <token>`; returns the username."""
    if credentials is None or not credentials.credentials.strip():
        raise HTTPException(
            status_code=401, detail="Missing bearer token", headers=_BEARER
        )
    session = auth_service.validate_session(credentials.credentials.strip())
    if session is None:
        raise HTTPException(
            status_code=401, detail="Invalid or expired token", headers=_BEARER
        )
    return session["username"]