# Architecture — Farmer Krishi Sahayak

## Flow
Farmer speaks/types/uploads
  → (if voice) Gemini STT / (if image) Gemini OCR
  → text query
  → check FAQ table (SQLite) — instant, no API
  → if no match: RAG search (ChromaDB, local embeddings) — no API
  → matched chunk + query → AI rotation layer → answer text
  → answer shown as text + spoken via TTS
  → if no RAG match, answer flagged "unverified"

## AI API Rotation (ai_service.py)
Primary: Groq (text chat) → Gemini (OCR/voice, also text fallback) →
GitHub Models (backup chat)
Fallback pool: Cohere → OpenRouter → HuggingFace (small tasks only)
On 429/error: try next provider in order, log which one answered.

## Folder Structure
backend/
  main.py
  app/
    routes/      (chat, schemes, prices, grievance, docs)
    services/     (ai_service.py, rag_service.py, ocr_service.py)
    models/       (SQLite schema)
  datasets/       (existing, per-scheme folders)
  chroma_db/
  app.db          (SQLite)

## Data
- ChromaDB: one collection, chunks tagged with source/scheme
- SQLite tables: faqs, grievances, officers, users (optional), reminders