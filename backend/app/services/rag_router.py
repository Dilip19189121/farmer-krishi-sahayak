# rag_router.py — rule-based retrieval decisions + answer verification.
#
# Stage 2. Decides per query, using plain heuristics only (no extra AI calls,
# so simple questions pay no added latency):
#   (a) does the query need transformation (expanded variant) before retrieval?
#   (b) is hybrid (keyword+vector) search needed, or is vector-only enough?
#   (c) is reranking needed because the top result scores are too close?
# and, after ai_service generates an answer, checks that the text is actually
# supported by the retrieved chunks. A weakly-supported answer is marked
# unverified internally (provenance-count field in the API) but per our
# existing product decision it is still delivered without any user-facing
# "unverified" label.
#
# The thresholds are tuned against the demo knowledge base (see the low-score
# constants below); they are module constants so they can be adjusted at the
# top of the file without touching the logic.

import re
from typing import Optional

from app.services import rag_service

# ---------------------------------------------------------------------------
# (a) Query transformation: who needs an expanded retrieval variant?
# ---------------------------------------------------------------------------

# Vague follow-up/informal openers that add nothing to retrieval matching.
VAGUE_OPENERS = (
    "what about", "how about", "and what", "tell me more",
    "then what", "so what", "what if",
)

# Romanized Hindi interjections common in informal farmer wording.
HINGLISH_FILLERS = re.compile(
    r"\b(hai|hain|hoga|hogi|kya|kaise|kab|kahan|mujhe|mera|meri|mere|"
    r"karo|karna|kar|nahi|nahin|acha|theek)\b",
    re.IGNORECASE,
)

# Questions that are really about a short topic even if worded long; this is
# the minimum number of content tokens we expect in a well-formed query.
MIN_CONTENT_TOKENS = 4


def needs_transformation(query: str) -> tuple[bool, str]:
    """Should we retrieve with an expanded query variant as well as the raw one?

    Returns (decision, reason). Triggered by: very short queries (< 4 content
    tokens), vague openers ("what about ..."), heavy informal/romanized-Hindi
    filler wording, or queries with no clear topic noun — all patterns where
    the raw string alone retrieves poorly.
    """
    q = (query or "").strip()
    if not q:
        return False, "empty query"
    content = rag_service._content_tokens(q)
    lowered = q.lower()
    if len(content) < MIN_CONTENT_TOKENS:
        return True, f"very short query ({len(content)} content tokens)"
    if any(lowered.startswith(v) for v in VAGUE_OPENERS):
        return True, "vague opener detected"
    fillers = len(HINGLISH_FILLERS.findall(q))
    if fillers >= 2 and len(content) < 2 * MIN_CONTENT_TOKENS:
        return True, f"informal wording ({fillers} Hinglish filler tokens)"
    return False, "well-formed query"


def expand_query(query: str) -> list[str]:
    """Return retrieval query variants [original, expanded].

    The expansion is a deterministic template, not an AI call: it adds a
    boilerplate enrichment suited to farmer-scheme questions so the vector
    retriever and the keyword layer both see the full topic.
    """
    content = rag_service._content_tokens(query)
    return [
        query,
        f"{query} eligibility amount benefit procedure details official "
        f"information {' '.join(content)}",
    ]


# ---------------------------------------------------------------------------
# (b) Hybrid vs vector-only decision
# ---------------------------------------------------------------------------

# Tokens where exact matching matters: numbers/percentages, scheme/authority
# acronyms, single-rare-word lookups. When present, keyword candidates can tip
# a ranking that pure vector similarity gets wrong.
EXACT_TOKEN_RE = re.compile(
    r"\b(\d+(\.\d+)?\s*%|\d+(\.\d+)?%|PM-[A-Z]+|[A-Z]{2,}|"
    r"\d{4}-\d{2}|\b\d+\b)",
    re.UNICODE,
)


def needs_hybrid_search(query: str) -> tuple[bool, str]:
    """Is hybrid (keyword + vector) retrieval needed, or vector-only enough?

    Returns (decision, reason). Hybrid is used when the query carries
    exact-match tokens (percentages, amounts, acronyms like CIB&RC/PM-KISAN,
    years) because those need literal presence in the winning chunk, or when
    the query is very long (multi-constraint questions benefit from
    term-based scoring).
    """
    q = (query or "").strip()
    if not q:
        return False, "empty query"
    if EXACT_TOKEN_RE.search(q):
        return True, "exact tokens present (number/percent/acronym)"
    content = rag_service._content_tokens(q)
    if len(content) > 8:
        return True, "long multi-constraint query"
    return False, "simple query — vector-only is enough"


# ---------------------------------------------------------------------------
# (c) Rerank decision (score-spread check)
# ---------------------------------------------------------------------------

# Top-1/top-2 distance gap below this is "too close to separate".
RERANK_TRIGGER_SPREAD = 0.015
# Below this best-hit "combined" score the retrieval has no clear winner, so
# keyword tie-breaking is worth a try.
WEAK_TOP_SCORE = 0.45

def needs_rerank(hits: list[dict]) -> tuple[bool, str]:
    """Would keyword tie-breaking change which chunk ranks first?

    Returns (decision, reason). Fires when the top-1 and top-2 scores are so
    close that exact-term overlap could disagree with the vector/blend order,
    or — far more common in practice — when the top-1 score itself is weak
    (no clear winner at all).
    """
    if len(hits) < 2:
        return False, "fewer than 2 hits"
    # Compare on the ranking score actually in use: "combined" for hybrid
    # results, raw distance for vector-only results.
    if all("combined" in h for h in hits[:2]):
        spread = hits[0]["combined"] - hits[1]["combined"]
        if spread < RERANK_TRIGGER_SPREAD:
            return True, f"top-2 combined-score spread {spread:.4f} below threshold"
    else:
        spread = float(hits[0].get("distance", 2.0)) - float(
            hits[1].get("distance", 2.0)
        )
        if spread < RERANK_TRIGGER_SPREAD:
            return True, f"top-2 distance spread {spread:.4f} below threshold"
    best = hits[0].get("combined", 1.0 - hits[0].get("distance", 2.0))
    if best < WEAK_TOP_SCORE:
        return True, f"best combined score {best:.3f} below {WEAK_TOP_SCORE}"
    return False, "clear winner in retrieval"


# ---------------------------------------------------------------------------
# Answer verification (after generation)
# ---------------------------------------------------------------------------

VERIFICATION_TOKEN_OVERLAP_RATIO = 0.18   # len(answer∩support)/len(answer)
VERIFICATION_WEAK_TOP_SCORE = 0.45        # below this the retrieval was
                                         # considered weak to begin with
# Distinctive-token requirement: the answer must share enough SPECIFIC
# content with a SINGLE retrieved chunk that the question itself does not
# already contain. A distinctive token must pass ALL of:
#   - at least MIN_TOKEN_LEN characters (filters PDF-extraction debris like
#     "re", "t", "s" that scatter across unrelated docs);
#   - not a bare <=1-digit number ("6"/"8" collide across everything); a
#     bare number with more digits ("2006", "500") can be identifying;
#   - corpus doc-spread <= MAX_DOC_SPREAD ("as" appears in ~34% of chunks:
#     background vocabulary carries no topic signal).
# And they must CONVERGE in one chunk (MIN_DISTINCTIVE=single-chunk count),
# not arrive one-per-chunk from unrelated hits — "held" from a PMFBY page
# plus "four" from a banana page is luck, not grounding.
# Calibrated on 9 cases: cricket/tractor/football/coffee/router/NFL/FIFA
# (no real document on the topic) yield per-chunk distinctive counts of 0-1;
# genuinely grounded agri answers reach 2 in the supporting chunk.
VERIFICATION_MIN_DISTINCTIVE = 2
VERIFICATION_MAX_DOC_SPREAD = 0.10
VERIFICATION_MIN_TOKEN_LEN = 3
VERIFICATION_MAX_BARE_DIGITS = 1


def verify_answer(answer: str, hits: list[dict], question: str = "") -> dict:
    """Check how well the generated answer is supported by the retrieved chunks.

    A cheap lexical check, not an AI call, with two tests:

    1. Token coverage: the answer's content tokens must be largely covered by
       the retrieved chunks (old check, kept).
    2. Distinctive content: the answer must share at least
       VERIFICATION_MIN_DISTINCTIVE tokens with the chunks that the question
       does NOT already contain (bare single digits excluded) — a question's
       own vocabulary echoed in the answer is no proof the chunks contributed
       anything (the cricket World-Cup bug: a sports question scored 0.37
       token overlap against insurance/farming PDFs purely on "6", "8",
       "australia", "final", "score", "india", "world" — no chunk contained
       any distinctive World-Cup fact).

    Returns
        {"supported": bool, "overlap_ratio": float, "supporting_chunks": int,
         "distinctive_coverage": bool}
    `supported` is True when both tests pass; False means the answer came
    from general knowledge or is guessing (retrieval did not supply the
    distinctive content). Per the existing product decision, an ungrounded
    answer is still *sent* to the farmer (no user-facing label) — the flag is
    for internal monitoring/evaluation only.
    """
    answer_tokens = set(rag_service._content_tokens(answer))
    if not answer_tokens or not hits:
        return {
            "supported": False,
            "overlap_ratio": 0.0,
            "supporting_chunks": 0,
            "distinctive_coverage": False,
        }

    # Tokens the question already contains cannot count as chunk-sourced:
    # exclude them before evaluating both overlap and phrase coverage so
    # question-vocabulary echo never masquerades as grounding.
    distinctive_tokens = answer_tokens - (
        set(rag_service._content_tokens(question)) if question else set()
    )
    # Keep only tokens that can actually carry evidence: drop bare digits
    # ("6", "8" match everything) and corpus-ubiquitous vocabulary.
    distinctive_tokens = {
        t for t in distinctive_tokens
        if len(t) >= VERIFICATION_MIN_TOKEN_LEN
        and (t.isdigit() is False or len(t) > VERIFICATION_MAX_BARE_DIGITS)
        and rag_service.token_doc_spread(t) <= VERIFICATION_MAX_DOC_SPREAD
    }
    if not distinctive_tokens:  # answer is pure question echo -> not grounded
        return {
            "supported": False,
            "overlap_ratio": round(
                len(answer_tokens & set(rag_service._content_tokens(
                    " ".join(h["text"] for h in hits))))
                / len(answer_tokens), 3),
            "supporting_chunks": 0,
            "distinctive_coverage": False,
        }

    support_tokens: set[str] = set()
    supporting = 0
    best_chunk_distinctive = 0
    for hit in hits:
        hit_tokens = set(rag_service._content_tokens(hit["text"]))
        if distinctive_tokens & hit_tokens:
            supporting += 1
        support_tokens |= hit_tokens
    overlap = len(answer_tokens & support_tokens) / len(answer_tokens)

    distinctive_overlapped = distinctive_tokens & support_tokens

    best = max(
        1.0 - float(h.get("distance", 1.0)) for h in hits
    ) if hits else 0.0
    # One single chunk must supply the required count of distinctive tokens:
    # convergence from unrelated chunks proves nothing (a sports answer can
    # pick "held" from one PDF and "four" from another).
    best_chunk_distinctive = max(
        (
            len(distinctive_tokens & set(rag_service._content_tokens(h["text"])))
            for h in hits
        ),
        default=0,
    )
    supported = (
        overlap >= VERIFICATION_TOKEN_OVERLAP_RATIO
        and best >= VERIFICATION_WEAK_TOP_SCORE
        and supporting >= 1
        and best_chunk_distinctive >= VERIFICATION_MIN_DISTINCTIVE
    )
    return {
        "supported": bool(supported),
        "overlap_ratio": round(overlap, 3),
        "supporting_chunks": supporting,
        "distinctive_coverage": bool(distinctive_overlapped),
    }


def route(query: str, hits: Optional[list[dict]] = None) -> dict:
    """All retrieval decisions for one query in a single call (for tests/ops).

    Returns {"transform", "expand_queries", "hybrid", "rerank", "reasons"}.
    """
    transform, t_reason = needs_transformation(query)
    hybrid, h_reason = needs_hybrid_search(query)
    expand_queries = expand_query(query) if transform else [query]
    rerank, r_reason = (
        needs_rerank(hits) if hits else (False, "no hits yet")
    )
    return {
        "transform": transform,
        "expand_queries": expand_queries,
        "hybrid": hybrid,
        "rerank": rerank,
        "reasons": {"transform": t_reason, "hybrid": h_reason, "rerank": r_reason},
    }
