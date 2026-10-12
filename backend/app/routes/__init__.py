# routes/__init__.py — Flask/FastAPI-style route package re-export.

from . import chat, grievance, info, officer, presence  # noqa: F401

__all__ = ["chat", "grievance", "info", "officer", "presence"]
