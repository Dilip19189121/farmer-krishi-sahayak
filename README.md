# Krishi Sahayak

Multilingual, voice-first AI assistant for farmers and rural cooperative members, providing verified guidance on government schemes, crop advisory, market prices, pesticide information, and grievance redressal — built for low-literacy rural users.

## Tech Stack

- Backend: Python + FastAPI (uvicorn main:app) — port 8000
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS 4 — port 3000
- RAG: ChromaDB + `intfloat/multilingual-e5-small` embeddings
- AI: 5-provider fallback (Groq → Gemini → Cohere → OpenRouter → HuggingFace)
- Speech: Gemini STT / Groq Whisper (STT); edge-tts / gTTS / pyttsx3 (TTS)
- DB: SQLite (grievances, chat history, voice usage)
- Docs: `backend/docs/api_contract.md`

## Backend Features

- RAG over curated agriculture PDFs/JSONL/parquet (schemes, prices, pesticides, farming techniques, ICAR, PPQS)
- 5-provider AI fallback (Groq, Gemini, Cohere, OpenRouter, HuggingFace)
- Speech-to-speech: Gemini STT (primary) → Groq Whisper (fallback); edge-tts → gTTS → pyttsx3 for TTS
- Grievance system: file, list, update status (guest files, officer updates via bearer token)
- Presence detection: laptop webcam watchdog (YuNet face detector) seeded by `/presence/*`
- Hardware state machine: kiosk mode with ultrasonic sensor trigger, language timeout, welcome retries, absence grace, interruption detection, session timeout
- Voice usage limiting: per-session per-turn cap, 5-min session quota, 15-min cooldown

## Frontend Features

- Trilingual (Telugu / Hindi / English) — full i18n for all screens
- Voice chat (recorded audio → `/chat/voice` → spoken back)
- Schemes, prices, grievances pages
- Officer dashboard (login → list / update grievance status)

## Run

Backend (terminal 1):

```sh
cd backend
cp .env.example .env   # fill in API keys and officer password
uvicorn main:app       # port 8000
```

Frontend (terminal 2):

```sh
cd frontend
npm run dev            # port 3000
```

## Environment Variables

Backend: `backend/.env` — copy from `backend/.env.example` (Gemini, Groq, Cohere, OpenRouter, HuggingFace keys; officer username/password; kiosk hardware defaults).
Frontend: `frontend/.env` — copy from `frontend/.env.example`.

## Hardware (fully optional)

ESP32 + ultrasonic sensor wired to a Raspberry Pi or dev machine. The kiosk state machine is controlled via `POST /hardware/trigger`; the ultrasonic sensor is opt-in (`HARDWARE_TRIG_PIN`). Without a sensor, the kiosk runs as a laptop demo driven by the web UI. Presence detection uses an optional USB webcam.

## No Paid APIs

Everything runs on free tiers or locally. The AI rotation uses free-tier models; TTS prefers local/neural free voices; RAG embeds run locally. No paid APIs are used.
