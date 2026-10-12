# Product Requirements Document — Farmer Krishi Sahayak

## Problem
Farmers and rural cooperative members lack easy access to reliable
information on government schemes, crop protection, market prices and
grievance redressal, due to language barriers and low literacy.

## Users
- Farmers (primary, often low-literacy, voice-first)
- Literate rural users / cooperative members (can type, use icon sections)
- Officers (grievance dashboard)

## Core Features
1. Voice-first multilingual chat (Telugu, Hindi, English) — centered UI,
   Gemini-style orb, live captions, typing option
2. RAG-based answers — source-backed, from curated datasets (no
   verified/unverified labels shown in UI)
3. Document/notice scanner (camera/upload → OCR → simplify/explain →
   deadline extraction → calendar reminder)
4. Pesticide label scanner (camera → CIB&RC cross-check)
5. Market/mandi price checker
6. Schemes section (PM-KISAN, PMFBY, PACS/cooperative)
7. Financial literacy section
8. Grievance filing (voice → structured complaint → officer dashboard)
9. Officer dashboard (view/update grievances)
10. Guest mode by default; optional phone+PIN login for history/grievance tracking

## Non-Goals (for MVP)
- Full 22-language support (MVP: Telugu, Hindi, English)
- CPGRAMS integration (future work)
- Paid SMS/WhatsApp notifications

## Tech Constraints
- No paid APIs; free-tier only
- Multi-API rotation: Groq + Gemini + GitHub Models (primary),
  Cohere + OpenRouter + HuggingFace (fallback)
- RAG: ChromaDB + local sentence-transformers embeddings
- Structured data: SQLite
- Backend: Python, FastAPI