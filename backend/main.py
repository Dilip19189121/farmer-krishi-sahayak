from contextlib import asynccontextmanager
from threading import Event

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import chat, grievance, hardware, info, officer, presence

def _shutdown_presence() -> None:

    from app.services import presence

    presence.stop_presence()

def _shutdown_presence_background() -> None:

    from app.services import presence

    presence.stop_presence()
    import time

    deadline = time.monotonic() + 2.0
    while time.monotonic() < deadline:
        try:
            if not presence._presence_stop_flag.is_set():
                break
        except Exception:
            break
        time.sleep(0.05)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload the multilingual-e5-small embedding model at startup so the first
    # farmer request (and every RAG call afterwards) does not pay the 5-10s
    # model-load penalty.
    rag_service.load_embedding_model()
from app.services import rag_service
def shutdown_event() -> None:
    """FastAPI shutdown handler: stop presence/camera on exit."""
    _shutdown_presence_background()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload the multilingual-e5-small embedding model at startup so the first
    # farmer request (and every RAG call afterwards) does not pay the 5-10s
    # model-load penalty.
    rag_service.load_embedding_model()
    yield

app = FastAPI(
    title="Backend API",
    description="FastAPI backend serving the multilingual agriculture datasets",
    version="0.1.0",
    lifespan=lifespan,
)


# CORS: allow the Vite dev servers (Application is served from port 3000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(info.router)
app.include_router(officer.router)
app.include_router(presence.router)
app.include_router(grievance.router)
app.include_router(hardware.router)

@app.get("/")
def health_check():
    return {"status": "running"}


@app.on_event("shutdown")
def shutdown_event() -> None:
    """FastAPI shutdown handler: stop presence/camera on exit."""
    if _watcher is not None:
        _watcher._stop_event.set()
        _watcher.stop()
        _watcher = None
