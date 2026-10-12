# grievance.py — farmer grievance filing and the officer dashboard view.
#
# Plain sqlite3 (no ORM). Rows live in backend/app.db. Guests can file without
# login; the short grievance id (e.g. "GR1023") is what an officer reads out.

import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.routes.officer import require_officer

router = APIRouter(prefix="/grievance", tags=["grievance"])

# grievance.py -> app/routes/ -> app/ -> backend/
DB_PATH = Path(__file__).resolve().parents[2] / "app.db"

STATUSES = ("new", "seen", "in_progress", "resolved")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS grievances (
    grievance_id TEXT PRIMARY KEY,
    name         TEXT,
    village      TEXT,
    phone        TEXT,
    problem      TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'seen', 'in_progress', 'resolved')),
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_grievances_created_at ON grievances (created_at);
"""


def _now() -> str:
    # Millisecond precision so a status update in the same second is still
    # distinguishable from created_at.
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the grievances table if it does not exist yet."""
    with closing(_connect()) as conn:
        conn.executescript(_SCHEMA)
        conn.commit()


def _generate_id(conn: sqlite3.Connection) -> str:
    """Allocate a short, speakable id like 'GR1023' that is not already used."""
    import secrets

    for _ in range(25):
        candidate = f"GR{secrets.randbelow(9000) + 1000}"
        taken = conn.execute(
            "SELECT 1 FROM grievances WHERE grievance_id = ?", (candidate,)
        ).fetchone()
        if taken is None:
            return candidate
    raise RuntimeError("could not allocate a free grievance id")


class GrievanceCreate(BaseModel):
    problem: str = Field(..., min_length=1, description="What went wrong")
    name: str | None = Field(default=None, description="Farmer's name")
    village: str | None = Field(default=None, description="Village / block")
    phone: str | None = Field(default=None, description="Contact number")


class GrievanceStatusUpdate(BaseModel):
    status: Literal["new", "seen", "in_progress", "resolved"]


class GrievanceCreated(BaseModel):
    grievance_id: str
    status: str


class GrievanceOut(BaseModel):
    grievance_id: str
    name: str | None = None
    village: str | None = None
    phone: str | None = None
    problem: str
    status: str
    created_at: str
    updated_at: str


init_db()


@router.post("", response_model=GrievanceCreated, status_code=201)
def create_grievance(payload: GrievanceCreate):
    """File a new grievance; only the problem statement is required."""
    problem = payload.problem.strip()
    if not problem:
        raise HTTPException(status_code=422, detail="problem must not be blank")

    timestamp = _now()
    with closing(_connect()) as conn:
        grievance_id = _generate_id(conn)
        conn.execute(
            "INSERT INTO grievances (grievance_id, name, village, phone, problem,"
            " status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'new', ?, ?)",
            (
                grievance_id,
                payload.name,
                payload.village,
                payload.phone,
                problem,
                timestamp,
                timestamp,
            ),
        )
        conn.commit()
    return GrievanceCreated(grievance_id=grievance_id, status="new")


@router.get("/officer/list", dependencies=[Depends(require_officer)])
def officer_list():
    """All grievances, newest first (officer dashboard; token required)."""
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT * FROM grievances ORDER BY created_at DESC, rowid DESC"
        ).fetchall()
    return {"count": len(rows), "grievances": [dict(row) for row in rows]}


@router.get("/{grievance_id}", response_model=GrievanceOut)
def get_grievance(grievance_id: str):
    """Current status and details for one grievance id."""
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT * FROM grievances WHERE grievance_id = ?", (grievance_id.upper(),)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"grievance {grievance_id} not found")
    return GrievanceOut(**dict(row))


@router.patch(
    "/{grievance_id}/status",
    response_model=GrievanceOut,
    dependencies=[Depends(require_officer)],
)
def update_status(grievance_id: str, payload: GrievanceStatusUpdate):
    """Officer updates the status to new/seen/in_progress/resolved (token required)."""
    with closing(_connect()) as conn:
        updated = conn.execute(
            "UPDATE grievances SET status = ?, updated_at = ? WHERE grievance_id = ?",
            (payload.status, _now(), grievance_id.upper()),
        )
        conn.commit()
        if updated.rowcount == 0:
            raise HTTPException(
                status_code=404, detail=f"grievance {grievance_id} not found"
            )
        row = conn.execute(
            "SELECT * FROM grievances WHERE grievance_id = ?", (grievance_id.upper(),)
        ).fetchone()
    return GrievanceOut(**dict(row))