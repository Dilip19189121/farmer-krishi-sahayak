# info.py — read-only catalogue views: schemes and market prices.

from fastapi import APIRouter, HTTPException

from app.services import rag_service

router = APIRouter(tags=["info"])

# Scheme summaries. Names/URLs/chunk counts are read back from the ingested
# knowledge-base metadata; these descriptions are curated one-liners.
SCHEME_SPECS = [
    {
        "name": "PM-KISAN",
        "description": (
            "Income support of Rs 6,000 a year in three equal instalments for "
            "landholding farmer families, paid directly into their bank account."
        ),
        "match_scheme": "PM-KISAN",
    },
    {
        "name": "PMFBY",
        "description": (
            "Pradhan Mantri Fasal Bima Yojana: crop insurance covering prevented "
            "sowing, standing-crop, yield and post-harvest losses."
        ),
        "match_source_folder": "PMFBY",
    },
    {
        "name": "PACS Computerization",
        "description": (
            "Revised scheme guidelines and model bye-laws for computerising "
            "Primary Agricultural Credit Societies with a single ERP system."
        ),
        "match_source_folder": "pacs-cooperative",
    },
]


def _source_folder(metadata: dict) -> str | None:
    """Top-level folder of a PDF source path, e.g. 'PMFBY\\Hindi.pdf' -> 'PMFBY'."""
    source = metadata.get("source")
    if not source:
        return None
    return source.replace("\\", "/").split("/")[0]


@router.get("/schemes")
def list_schemes():
    """Summaries of the main schemes, with coverage read from the knowledge base."""
    try:
        metadata = rag_service.collection_metadata()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"knowledge base unavailable: {exc}") from exc

    schemes = []
    for spec in SCHEME_SPECS:
        matched = [
            md
            for md in metadata
            if (spec.get("match_scheme") and md.get("scheme") == spec["match_scheme"])
            or (spec.get("match_source_folder") and _source_folder(md) == spec["match_source_folder"])
        ]
        urls = sorted({md["source_url"] for md in matched if md.get("source_url")})
        files = sorted({md["source"] for md in matched if md.get("source")})
        schemes.append(
            {
                "name": spec["name"],
                "description": spec["description"],
                "source_url": urls[0] if urls else None,
                "chunk_count": len(matched),
                "source_files": files,
            }
        )

    return {"schemes": schemes, "total_knowledge_chunks": len(metadata)}


@router.get("/prices")
def list_prices():
    """Market-wise price and arrival records from the prices dataset."""
    try:
        return rag_service.load_market_prices()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"could not read prices: {exc}") from exc