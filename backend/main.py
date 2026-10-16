from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import chat, grievance, hardware, info, officer, presence

app = FastAPI(
    title="Backend API",
    description="FastAPI backend serving the multilingual agriculture datasets",
    version="0.1.0",
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
