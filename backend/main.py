from fastapi import FastAPI

from app.routes import chat, grievance, info, officer, presence

app = FastAPI(
    title="Backend API",
    description="FastAPI backend serving the multilingual agriculture datasets",
    version="0.1.0",
)

app.include_router(chat.router)
app.include_router(info.router)
app.include_router(officer.router)
app.include_router(presence.router)
app.include_router(grievance.router)


@app.get("/")
def health_check():
    return {"status": "running"}
