# Farmer Krishi Sahayak

A multilingual, voice-first AI assistant for farmers and rural cooperative
members, providing verified guidance on government schemes, crop advisory,
market prices, pesticide information, and grievance redressal — built for
low-literacy rural users.

## Problem
Farmers and rural stakeholders often lack easy access to reliable
information on schemes, crop protection, and grievance support due to
language barriers and low literacy.

## Features
- Voice-first multilingual chat (Telugu, Hindi, English)
- Source-backed answers using RAG (no hallucinated info)
- Document/notice scanner with OCR
- Pesticide label decoder
- Mandi price checker
- Scheme guidance (PM-KISAN, PMFBY, PACS)
- Grievance filing and officer dashboard
- Works offline/locally — no paid cloud dependency

## Tech Stack
- Backend: Python, FastAPI
- RAG: ChromaDB, sentence-transformers
- Database: SQLite
- AI: Gemini API (primary) + local Ollama model (fallback)
- Speech: Bhashini / Whisper (STT), Piper / Indic-TTS (TTS)
- OCR: Tesseract
- Frontend: PWA (HTML/CSS/JS)

## Status
🚧 In development — dataset collection and backend setup phase.

## Setup
(instructions added once backend is running)

## License
MIT
