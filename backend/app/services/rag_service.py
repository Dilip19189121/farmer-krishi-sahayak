# rag_service.py — RAG pipeline over the curated PDF datasets.
#
# Step 1: locate the PDFs in "multiligual datasets" and report how many pages
#   of text were extracted from each (confirmed working).
# Step 2: chunk the extracted page text into ~300-500 word chunks
#   (word count as token estimate), tagged with source filename + page number.
# Step 3: embed the chunks (sub-50-word fragments dropped) with
#   intfloat/multilingual-e5-small into a ChromaDB collection "farmer_knowledge"
#   at backend/chroma_db/, and query it via search().
# Step 4: also ingest the dataset *.jsonl rows (PM-KISAN train/test)
#   into the same collection, deduplicated by "context".
# Step 5: also ingest the Agriculture *.parquet QA rows, deduplicated
#   by "answers", skipping Uganda/Cassava (region-specific) content.
# Step 6 (current): also ingest the CIB&RC registered-pesticides PDF(s) under
#   "pesticides/" through the same PDF pipeline, tagged kind="pesticide".
# Step 7 (Stage A): ingest the newly added datasets through the same PDF
#   pipeline with per-folder kind tags — "indian farming techniques/" ->
#   kind="farming_technique", "CROPS PLANNING/" -> kind="crop_planning",
#   "ICAR/" -> kind="icar", "PPQS/" -> kind="ppqs". The state-specific
#   AP18-RangaReddy crop/climate PDF is under "CROPS PLANNING/", so it is
#   tagged kind="crop_planning" like the rest of that folder. New price
#   reports in "prices/" are ingested as plain PDF chunks (kind="pdf") and
#   are additionally readable as structured records via load_market_prices().

import csv
import hashlib
import json
import math
import re
import sys
from pathlib import Path

import chromadb
import pandas as pd
import pdfplumber
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# rag_service.py -> app/services/ -> app/ -> backend/ -> repo root
REPO_ROOT = Path(__file__).resolve().parents[3]
DATASETS_DIR = REPO_ROOT / "multiligual datasets"
CHROMA_DIR = REPO_ROOT / "backend" / "chroma_db"

# Token estimate = word count. Chunks are capped at CHUNK_MAX_TOKENS; a short
# trailing fragment of a page is merged into the previous chunk when it fits,
# so we don't strand tiny chunks. No overlap for now.
CHUNK_MAX_TOKENS = 500
CHUNK_TAIL_MERGE_MIN = 100


def find_pdfs(datasets_dir: Path = DATASETS_DIR) -> list[Path]:
    """Return every PDF under the datasets folder, sorted for stable output."""
    if not datasets_dir.is_dir():
        raise FileNotFoundError(
            f"Datasets folder not found: {datasets_dir}\n"
            "Expected the 'multiligual datasets' folder at the repo root."
        )
    return sorted(datasets_dir.rglob("*.pdf"))


def count_pdf_text_pages(pdf_path: Path) -> tuple[int, int]:
    """Extract text page-by-page; return (pages_with_text, total_pages)."""
    pages_with_text = 0
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        for page in pdf.pages:
            if (page.extract_text() or "").strip():
                pages_with_text += 1
    return pages_with_text, total_pages


def load_pdfs_and_report(datasets_dir: Path = DATASETS_DIR) -> dict[Path, tuple[int, int]]:
    """Read every PDF and print how many pages of text were extracted from each."""
    pdfs = find_pdfs(datasets_dir)
    print(f"Found {len(pdfs)} PDF(s) in {datasets_dir}\n")

    results: dict[Path, tuple[int, int]] = {}
    for pdf_path in pdfs:
        rel = pdf_path.relative_to(datasets_dir)
        try:
            pages_with_text, total_pages = count_pdf_text_pages(pdf_path)
        except Exception as exc:  # unreadable/corrupt PDF: report and continue
            print(f"[ERROR] {rel}: {exc}")
            continue
        results[pdf_path] = (pages_with_text, total_pages)

        note = ""
        if pages_with_text == 0:
            note = "  <- no extractable text (scanned/image PDF?)"
        print(f"{rel}: {pages_with_text}/{total_pages} pages with text{note}")

    total_text = sum(t for t, _ in results.values())
    total_pages = sum(p for _, p in results.values())
    print(f"\nTotal: {total_text}/{total_pages} pages with text across {len(results)} PDF(s)")
    return results


# ---------------------------------------------------------------------------
# Step 2: chunking
# ---------------------------------------------------------------------------

def extract_pdf_page_texts(pdf_path: Path) -> list[tuple[int, str]]:
    """Extract non-empty text from each page; return [(1-based page number, text)]."""
    pages: list[tuple[int, str]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            text = (page.extract_text() or "").strip()
            if text:
                pages.append((page_no, text))
    return pages


def _split_into_chunks(text: str, max_tokens: int = CHUNK_MAX_TOKENS) -> list[str]:
    """Split one page's text into non-overlapping chunks of <= max_tokens words.

    Splits on sentence boundaries (including the Hindi danda '।'); a single
    sentence longer than max_tokens (e.g. table-like text) is hard-split by
    words. A short trailing fragment is merged into the previous chunk when
    it still fits.
    """
    sentences = re.split(r"(?<=[.!?:।])\s+", text.strip())
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    def flush() -> None:
        nonlocal current, current_len
        if current:
            chunks.append(" ".join(current))
            current, current_len = [], 0

    for sentence in sentences:
        words = sentence.split()
        n = len(words)
        if n == 0:
            continue
        if n > max_tokens:  # oversized sentence: hard-split by word count
            flush()
            for i in range(0, n, max_tokens):
                chunks.append(" ".join(words[i:i + max_tokens]))
            continue
        if current_len + n > max_tokens:
            flush()
        current.extend(words)
        current_len += n

    if current:
        if (
            current_len < CHUNK_TAIL_MERGE_MIN
            and chunks
            and len(chunks[-1].split()) + current_len <= max_tokens
        ):
            chunks[-1] += " " + " ".join(current)
        else:
            flush()
    return chunks


def pdf_kind(source: str) -> str:
    """Kind tag for a chunk extracted from a dataset PDF.

    Tagged by top-level folder so retrieval metadata stays meaningful:
    - "pesticides/" paras are the CIB&RC registered-formulation list -> "pesticide"
    - "indian farming techniques/" *Farming/*Horticulture issues -> "farming_technique"
    - "CROPS PLANNING/" (incl. the state-specific AP18-RangaReddy crop/climate
      data) -> "crop_planning"
    - "ICAR/" (Telangana Promising) -> "icar"
    - "PPQS/" SOPs + standards -> "ppqs"
    - everything else (scheme PDFs) -> "pdf"
    """
    top = source.replace("\\", "/").split("/")[0].strip().lower()
    return {
        "pesticides": "pesticide",
        "indian farming techniques": "farming_technique",
        "crops planning": "crop_planning",
        "icar": "icar",
        "ppqs": "ppqs",
    }.get(top, "pdf")


def chunk_pdfs(
    datasets_dir: Path = DATASETS_DIR, max_tokens: int = CHUNK_MAX_TOKENS
) -> list[dict]:
    """Chunk the text of every dataset PDF page.

    Returns a list of {"text": chunk, "metadata": {"source": relative
    filename, "page": 1-based page number}} dicts, in a stable order.
    """
    chunks: list[dict] = []
    for pdf_path in find_pdfs(datasets_dir):
        rel = str(pdf_path.relative_to(datasets_dir))
        for page_no, text in extract_pdf_page_texts(pdf_path):
            for piece in _split_into_chunks(text, max_tokens):
                chunks.append(
                    {"text": piece, "metadata": {"source": rel, "page": page_no}}
                )
    return chunks


# ---------------------------------------------------------------------------
# Step 3: embeddings + ChromaDB vector store
# ---------------------------------------------------------------------------

E5_MODEL_NAME = "intfloat/multilingual-e5-small"
# E5 models are trained with these input prefixes; using them noticeably
# improves retrieval quality.
E5_QUERY_PREFIX = "query: "
E5_PASSAGE_PREFIX = "passage: "
COLLECTION_NAME = "farmer_knowledge"
MIN_CHUNK_WORDS = 50  # drop sparse annexure/header fragments before embedding

_model = None


def _get_model() -> SentenceTransformer:
    """Lazy-load the sentence-transformers model once per process."""
    global _model
    if _model is None:
        print(f"Loading embedding model {E5_MODEL_NAME} ...")
        _model = SentenceTransformer(E5_MODEL_NAME)
    return _model


def load_jsonl_chunks(datasets_dir: Path = DATASETS_DIR) -> list[dict]:
    """Load the dataset *.jsonl files as chunks, deduplicated by context text.

    Each row's "context" becomes the chunk text; "question", "scheme" and
    "source_url" become metadata, tagged kind="jsonl" so it stays distinct from
    the PDF shape ({"source", "page"}). Many rows share a single context, so
    only the first occurrence of each distinct context is kept.
    """
    by_context: dict[str, dict] = {}
    total_rows = 0
    for jsonl_path in sorted(datasets_dir.rglob("*.jsonl")):
        file_rows = 0
        with jsonl_path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                text = str(row.get("context") or "").strip()
                if not text:
                    continue
                file_rows += 1
                if text in by_context:
                    continue  # duplicate context — keep the first row's question
                by_context[text] = {
                    "text": text,
                    "metadata": {
                        "kind": "jsonl",
                        "question": str(row.get("question") or ""),
                        "scheme": str(row.get("scheme") or ""),
                        "source_url": str(row.get("source_url") or ""),
                    },
                }
        total_rows += file_rows
        print(f"{jsonl_path.relative_to(datasets_dir)}: {file_rows} rows")
    chunks = list(by_context.values())
    print(f"JSONL: {total_rows} rows -> {len(chunks)} unique chunks")
    return chunks


# Agriculture parquet QA rows include Uganda/Cassava-specific content that is
# irrelevant to Indian farmers; those rows are dropped from the knowledge base.
PARQUET_EXCLUDE_TERMS = ("uganda", "cassava")


def load_parquet_chunks(datasets_dir: Path = DATASETS_DIR) -> list[dict]:
    """Load the dataset *.parquet files as chunks, deduplicated by answer text.

    Each row's "answers" becomes the chunk text; "question" is kept as
    metadata, tagged kind="parquet". Rows whose answer mentions Uganda or
    Cassava are skipped, and rows sharing an identical answer are collapsed to
    the first one (keeping its question).
    """
    by_answer: dict[str, dict] = {}
    total_rows = 0
    skipped_region = 0
    for pq_path in sorted(datasets_dir.rglob("*.parquet")):
        df = pd.read_parquet(pq_path)
        if "answers" not in df.columns:
            print(
                f"{pq_path.relative_to(datasets_dir)}: skipped "
                f"(no 'answers' column)"
            )
            continue
        kept = 0
        for question, answers in zip(df["question"], df["answers"]):
            if pd.isna(answers):
                continue
            text = str(answers).strip()
            if not text:
                continue
            total_rows += 1
            if any(term in text.lower() for term in PARQUET_EXCLUDE_TERMS):
                skipped_region += 1
                continue
            kept += 1
            if text in by_answer:
                continue  # duplicate answer — keep the first row's question
            by_answer[text] = {
                "text": text,
                "metadata": {
                    "kind": "parquet",
                    "question": "" if pd.isna(question) else str(question),
                },
            }
        print(f"{pq_path.relative_to(datasets_dir)}: {len(df)} rows -> {kept} kept")
    chunks = list(by_answer.values())
    print(
        f"Parquet: {total_rows} rows scanned, {skipped_region} skipped "
        f"(Uganda/Cassava), {len(chunks)} unique chunks"
    )
    return chunks


def embed_and_store(datasets_dir: Path = DATASETS_DIR) -> int:
    """Chunk the PDFs, load the JSONL and parquet rows, embed all, store in ChromaDB.

    PDF chunks are filtered by MIN_CHUNK_WORDS to drop sparse page fragments;
    JSONL contexts and parquet answers are curated units, so they are kept
    as-is. Rebuilds the "farmer_knowledge" collection from scratch on every run,
    so re-running never duplicates chunks. Returns the number of chunks stored.
    """
    pdf_all = chunk_pdfs(datasets_dir)
    pdf_chunks = [
        {
            **c,
            "metadata": {
                **c["metadata"],
                "kind": pdf_kind(c["metadata"]["source"]),
            },
        }
        for c in pdf_all
        if len(c["text"].split()) >= MIN_CHUNK_WORDS
    ]
    pdf_kind_counts: dict[str, int] = {}
    for c in pdf_chunks:
        kind = c["metadata"]["kind"]
        pdf_kind_counts[kind] = pdf_kind_counts.get(kind, 0) + 1
    kind_summary = " + ".join(
        f"{count} {kind}" for kind, count in sorted(pdf_kind_counts.items())
    )
    print(
        f"PDFs: {len(pdf_all)} chunks, kept {len(pdf_chunks)} "
        f"({kind_summary}; dropped "
        f"{len(pdf_all) - len(pdf_chunks)} sub-{MIN_CHUNK_WORDS}-word fragments)"
    )

    jsonl_chunks = load_jsonl_chunks(datasets_dir)
    parquet_chunks = load_parquet_chunks(datasets_dir)
    chunks = pdf_chunks + jsonl_chunks + parquet_chunks
    print(
        f"Embedding {len(chunks)} chunks "
        f"({kind_summary} + {len(jsonl_chunks)} JSONL + "
        f"{len(parquet_chunks)} parquet) ..."
    )

    model = _get_model()
    embeddings = model.encode(
        [E5_PASSAGE_PREFIX + c["text"] for c in chunks],
        batch_size=32,
        show_progress_bar=False,
        normalize_embeddings=True,
    )

    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR), settings=Settings(anonymized_telemetry=False)
    )
    if COLLECTION_NAME in {c.name for c in client.list_collections()}:
        client.delete_collection(COLLECTION_NAME)
    collection = client.get_or_create_collection(
        COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
    )
    collection.add(
        ids=[
            f"{hashlib.md5(c['text'].encode('utf-8')).hexdigest()}-{i}"
            for i, c in enumerate(chunks)
        ],
        documents=[c["text"] for c in chunks],
        embeddings=embeddings.tolist(),
        metadatas=[c["metadata"] for c in chunks],
    )
    print(f"Stored {collection.count()} chunks in '{COLLECTION_NAME}' at {CHROMA_DIR}")
    return collection.count()


def search(query: str, top_k: int = 3) -> list[dict]:
    """Embed the query and return the top_k most similar stored chunks.

    Returns [{"text", "metadata": {"source", "page"}, "distance"}] with
    ascending distance (cosine distance; lower = more similar).
    """
    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR), settings=Settings(anonymized_telemetry=False)
    )
    try:
        collection = client.get_collection(COLLECTION_NAME)
    except Exception as exc:
        raise RuntimeError(
            f"Collection '{COLLECTION_NAME}' not found in {CHROMA_DIR} — "
            "run embed_and_store() first."
        ) from exc

    model = _get_model()
    query_embedding = model.encode(
        [E5_QUERY_PREFIX + query], normalize_embeddings=True
    )[0]
    result = collection.query(
        query_embeddings=[query_embedding.tolist()],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )
    return [
        {"text": text, "metadata": meta, "distance": dist}
        for text, meta, dist in zip(
            result["documents"][0],
            result["metadatas"][0],
            result["distances"][0],
        )
    ]


# ---------------------------------------------------------------------------
# Stage 2: keyword (BM25-lite), multi-query + hybrid retrieval
# ---------------------------------------------------------------------------

# Unicode word regex: \w already matches Devanagari/Tamil/Telugu/etc. letters
# in addition to ASCII, so one pattern tokenizes every dataset language.
_TOKEN_RE = re.compile(r"\w+", re.UNICODE)

# Stopwords across English + common Romanized/Hinglish filler words. Kept as
# whole-word matches only (token equality), so real content words are safe.
STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "am",
    "do", "does", "did", "of", "in", "on", "for", "to", "and", "or", "at",
    "by", "with", "how", "what", "when", "which", "who", "can", "will",
    "would", "should", "i", "my", "me", "we", "our", "you", "your", "it",
    "its", "this", "that", "these", "those", "if", "not", "no", "so",
    "there", "here", "about", "into", "from", "have", "has", "had",
    "tell", "give", "each", "every", "one", "two", "many", "much",
    "kya", "kaise", "kab", "kahan", "kaun", "aur", "ya",
    "hai", "hain", "hoga", "hogi", "hota", "hoti", "honge", "mujhe",
    "mera", "meri", "mere", "hamara", "hamari", "ki", "ka", "ke", "ko",
    "se", "mein", "kar", "karna",
}

# BM25-lite tunables: scores only rank results, they are never displayed.
_BM25_K1 = 1.2
_BM25_B = 0.75
KW_WEIGHT = 0.35               # keyword share of the hybrid blend
VEC_WEIGHT = 1.0 - KW_WEIGHT   # vector share

# Corpus stats are cached per process (the collection only changes via
# `python rag_service.py`, a fresh process, so no invalidation hook is needed
# at request time).
_kw_cache: tuple[
    list[str], list[dict], list[dict[str, int]], list[int]
] | None = None


def _content_tokens(text: str) -> list[str]:
    """Lowercase word tokens minus stopwords (works for every language)."""
    return [t for t in _TOKEN_RE.findall(text.lower()) if t not in STOPWORDS]


def _corpus() -> tuple[list[str], list[dict], list[dict[str, int]], list[int]]:
    """(texts, metas, term_counts, token_lengths) for every stored chunk.

    Index i of each list refers to the same chunk. Built once per process
    from the ChromaDB collection; keyword scoring then needs no further
    database access.
    """
    global _kw_cache
    if _kw_cache is not None:
        return _kw_cache
    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR), settings=Settings(anonymized_telemetry=False)
    )
    data = client.get_collection(COLLECTION_NAME).get(
        include=["documents", "metadatas"]
    )
    texts = [str(t) for t in data["documents"]]
    metas = [m or {} for m in data["metadatas"]]
    counts: list[dict[str, int]] = []
    lengths: list[int] = []
    for text in texts:
        toks = _TOKEN_RE.findall(text.lower())
        lengths.append(len(toks))
        c: dict[str, int] = {}
        for t in toks:
            if t in STOPWORDS:
                continue
            c[t] = c.get(t, 0) + 1
        counts.append(c)
    _kw_cache = (texts, metas, counts, lengths)
    return _kw_cache


def token_doc_spread(token: str) -> float:
    """Share of collection chunks that contain `token` (0.0 .. 1.0).

    Used by rag_router.verify_answer() to reject ubiquitous vocabulary: a
    token present in a third of all chunks carries no topic evidence that a
    retrieved chunk contributed it. Computed over the cached corpus so it
    costs one pass on first call, then a dict lookup per token.
    """
    texts, _, _, _ = _corpus()
    global _doc_spread_cache
    if _doc_spread_cache is None:
        spread: dict[str, int] = {}
        for text in texts:
            for tok in set(_content_tokens(text)):
                spread[tok] = spread.get(tok, 0) + 1
        n = len(texts) or 1
        _doc_spread_cache = {tok: cnt / n for tok, cnt in spread.items()}
    return _doc_spread_cache.get(token, 0.0)


# token -> share of chunks containing it; built once per process alongside
# the keyword corpus.
_doc_spread_cache: dict[str, float] | None = None


def _idf_map(
    query_terms: list[str], counts: list[dict[str, int]]
) -> dict[str, float]:
    """BM25 idf per query term: log(1 + N / df) over the whole corpus."""
    df: dict[str, int] = {}
    for term in set(query_terms):
        df[term] = sum(1 for c in counts if term in c)
    return {
        t: math.log(1 + len(counts) / max(1, df[t])) for t in set(query_terms)
    }


def _bm25_term_score(
    counts: dict[str, int],
    doc_len: int,
    avgdl: float,
    terms: list[str],
    idf: dict[str, float],
) -> float:
    """Okapi BM25 score of one document for the given terms (0 when no match)."""
    if not terms or not idf:
        return 0.0
    score = 0.0
    norm = _BM25_K1 * (1 - _BM25_B + _BM25_B * max(1, doc_len) / max(1.0, avgdl))
    for term in terms:
        tf = counts.get(term, 0)
        if tf:
            score += idf[term] * tf * (_BM25_K1 + 1) / (tf + norm)
    return score


def keyword_search(query: str, top_k: int = 10) -> list[dict]:
    """Rank stored chunks by BM25-lite keyword relevance to the query.

    Returns [{"text", "metadata", "keyword_score"}] best-first, or [] when
    the query shares no content tokens with the corpus. Best for exact
    tokens (pesticide names, percentages, scheme acronyms, numbers) where
    embedding similarity loses the tie-break.
    """
    terms = _content_tokens(query)
    if not terms:
        return []
    texts, metas, counts, lengths = _corpus()
    idf = _idf_map(terms, counts)
    avgdl = (sum(lengths) / len(lengths)) if lengths else 1.0
    scored = [
        (i, _bm25_term_score(counts[i], lengths[i], avgdl, terms, idf))
        for i in range(len(texts))
    ]
    scored = [(i, s) for i, s in scored if s > 0]
    scored.sort(key=lambda kv: kv[1], reverse=True)
    return [
        {"text": texts[i], "metadata": metas[i], "keyword_score": score}
        for i, score in scored[:top_k]
    ]


def search_hybrid(
    queries: str | list[str], top_k: int = 5, fetch_k: int = 25
) -> list[dict]:
    """Merge vector search (per query) with BM25-lite keyword search.

    queries may be a single string or several (query transformation adds an
    expanded variant alongside the original); every variant feeds candidates
    into one deduplicated pool keyed by chunk text (the best vector distance
    across variants wins). Ranking blends VEC_WEIGHT * vector cosine
    similarity + KW_WEIGHT * normalized keyword score. Chunks found only by
    keywords get a real vector distance from their e5 embeddings (query and
    passages are both L2-normalized, so a dot product equals cosine
    similarity equals 1 - distance), keeping the result shape compatible
    with search().

    Returns [{"text", "metadata", "distance", "keyword_score", "combined"}]
    sorted by descending "combined".
    """
    if isinstance(queries, str):
        queries = [queries]
    queries = [q.strip() for q in queries if q.strip()]
    if not queries or top_k <= 0:
        return []

    model = _get_model()
    texts, metas, counts, lengths = _corpus()
    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR), settings=Settings(anonymized_telemetry=False)
    )
    collection = client.get_collection(COLLECTION_NAME)

    # Vector candidates: one e5 + ChromaDB batch for all query variants.
    q_embeddings = model.encode(
        [E5_QUERY_PREFIX + q for q in queries], normalize_embeddings=True
    ).tolist()
    n_docs = max(1, collection.count())
    vec = collection.query(
        query_embeddings=q_embeddings,
        n_results=min(max(fetch_k, top_k), n_docs),
        include=["documents", "metadatas", "distances"],
    )
    candidates: dict[str, dict] = {}
    for q_i in range(len(queries)):
        for text, meta, dist in zip(
            vec["documents"][q_i], vec["metadatas"][q_i], vec["distances"][q_i]
        ):
            key = hashlib.md5(str(text).encode("utf-8")).hexdigest()
            entry = candidates.setdefault(
                key,
                {
                    "text": text,
                    "metadata": meta or {},
                    "distance": dist,
                    "keyword_score": 0.0,
                },
            )
            entry["distance"] = min(entry["distance"], dist)

    # Keyword candidates: best BM25-lite score per chunk across the variants.
    kw_best: dict[int, float] = {}
    for q in queries:
        terms = _content_tokens(q)
        if not terms:
            continue
        idf = _idf_map(terms, counts)
        avgdl = (sum(lengths) / len(lengths)) if lengths else 1.0
        for i in range(len(texts)):
            score = _bm25_term_score(counts[i], lengths[i], avgdl, terms, idf)
            if score > 0 and score > kw_best.get(i, 0.0):
                kw_best[i] = score
    top_kw = sorted(kw_best.items(), key=lambda kv: kv[1], reverse=True)[
        :max(fetch_k, top_k)
    ]

    # Keyword-only chunks need a real vector distance for the blend.
    cand_texts = {c["text"] for c in candidates.values()}
    kw_only = [i for i, _ in top_kw if texts[i] not in cand_texts]
    if kw_only:
        d_embeddings = model.encode(
            [E5_PASSAGE_PREFIX + texts[i] for i in kw_only],
            normalize_embeddings=True,
        ).tolist()
        for i, d_emb in zip(kw_only, d_embeddings):
            best_sim = max(
                sum(a * b for a, b in zip(q_emb, d_emb)) for q_emb in q_embeddings
            )
            candidates[hashlib.md5(texts[i].encode("utf-8")).hexdigest()] = {
                "text": texts[i],
                "metadata": metas[i],
                "distance": max(0.0, min(2.0, 1.0 - best_sim)),
                "keyword_score": 0.0,
            }

    max_kw = max((s for _, s in top_kw), default=0.0)
    for i, score in top_kw:
        cand = candidates.get(hashlib.md5(texts[i].encode("utf-8")).hexdigest())
        if cand is not None and max_kw > 0:
            cand["keyword_score"] = score / max_kw
    for cand in candidates.values():
        vec_sim = max(0.0, 1.0 - cand["distance"])
        cand["combined"] = VEC_WEIGHT * vec_sim + KW_WEIGHT * cand["keyword_score"]

    ranked = sorted(candidates.values(), key=lambda c: c["combined"], reverse=True)
    return ranked[:top_k]


def retrieve(
    queries: str | list[str], top_k: int = 3, hybrid: bool = True
) -> list[dict]:
    """Unified retrieval entry used by the router flow in chat.py.

    hybrid=True  -> search_hybrid (vector + keyword blend, deduplicated).
    hybrid=False -> vector-only across the query variants, merged and
                    deduplicated the same way (best distance wins); this
                    path reuses the original search() unchanged.
    Both modes return the same hit shape as search() (hybrid adds
    "keyword_score"/"combined").
    """
    if isinstance(queries, str):
        queries = [queries]
    queries = [q.strip() for q in queries if q.strip()]
    if not queries:
        return []
    if hybrid:
        return search_hybrid(queries, top_k)

    merged: dict[str, dict] = {}
    for q in queries:
        for hit in search(q, top_k=top_k):
            key = hashlib.md5(hit["text"].encode("utf-8")).hexdigest()
            entry = merged.setdefault(
                key,
                {
                    "text": hit["text"],
                    "metadata": hit["metadata"],
                    "distance": hit["distance"],
                },
            )
            entry["distance"] = min(entry["distance"], hit["distance"])
    return sorted(merged.values(), key=lambda h: h["distance"])[:top_k]


def rerank_results(query: str, hits: list[dict]) -> list[dict]:
    """Re-order retrieved hits with keyword relevance as a tie-breaker.

    Used on router decision (c): when the top distances are too close to
    separate, exact-term overlap (pesticide names, percentages, acronyms)
    decides. Blends the same VEC/KW weights over each hit's vector distance
    and BM25-lite score, adds "keyword_score"/"combined", and re-sorts by
    "combined" descending. Hits keep their original "distance".
    """
    terms = _content_tokens(query)
    if not terms or len(hits) < 2:
        return hits
    texts, _, counts, lengths = _corpus()
    index_by_text = {t: i for i, t in enumerate(texts)}
    idf = _idf_map(terms, counts)
    avgdl = (sum(lengths) / len(lengths)) if lengths else 1.0
    for hit in hits:
        idx = index_by_text.get(str(hit["text"]))
        hit["keyword_score"] = (
            _bm25_term_score(counts[idx], lengths[idx], avgdl, terms, idf)
            if idx is not None
            else 0.0
        )
    max_kw = max(h["keyword_score"] for h in hits)
    for hit in hits:
        vec_sim = max(0.0, 1.0 - float(hit.get("distance", 2.0) or 2.0))
        kw_norm = hit["keyword_score"] / max_kw if max_kw > 0 else 0.0
        hit["combined"] = VEC_WEIGHT * vec_sim + KW_WEIGHT * kw_norm
    return sorted(hits, key=lambda h: h["combined"], reverse=True)


# ---------------------------------------------------------------------------
# Market price report (read-only view for GET /prices)
# ---------------------------------------------------------------------------
PRICES_DIR = DATASETS_DIR / "prices"
_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def _norm_cell(value: str) -> str:
    """Normalize a header cell: lowercase, drop punctuation/whitespace."""
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def _to_number(value: str | None) -> float | None:
    """Parse a table number like '2,900.00' or '-' into float/None."""
    if value is None:
        return None
    cleaned = re.sub(r"[^0-9.]", "", str(value))
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _to_iso_date(value: str | None) -> str | None:
    """Parse '21 Sep, 2026' (or '21-09-2026') into '2026-09-21'."""
    if not value:
        return None
    match = re.search(r"(\d{1,2})\s*([A-Za-z]{3})[a-z]*\.?,?\s*(\d{4})", str(value))
    if match:
        day, month, year = match.groups()
        month_num = _MONTHS.get(month.lower())
        if month_num:
            return f"{year}-{month_num:02d}-{int(day):02d}"
    match = re.search(r"(\d{4})-(\d{2})-(\d{2})", str(value))
    return match.group(0) if match else None


def _table_rows_from_pdf(pdf_path: Path) -> tuple[list[str], list[list]]:
    """Find the widest table in a PDF and return (header_cells, data_rows)."""
    with pdfplumber.open(pdf_path) as pdf:
        best: tuple[list[str], list[list]] = ([], [])
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                rows = [[(cell or "").strip() for cell in row] for row in table]
                # Header is the row that mentions the commodity column.
                header_index = next(
                    (
                        i
                        for i, row in enumerate(rows)
                        if any("commodity" in _norm_cell(cell) for cell in row)
                    ),
                    None,
                )
                if header_index is None:
                    continue
                header = rows[header_index]
                data = [row for row in rows[header_index + 1:] if any(row)]
                if len(data) > len(best[1]):
                    best = (header, data)
        return best


def _table_rows_from_csv(csv_path: Path) -> tuple[list[str], list[list]]:
    """Read a CSV whose first row is the header."""
    with csv_path.open(encoding="utf-8-sig", newline="") as fh:
        rows = [row for row in csv.reader(fh) if any(cell.strip() for cell in row)]
    if not rows:
        return [], []
    return [cell.strip() for cell in rows[0]], rows[1:]


def _records_from_table(header: list[str], rows: list[list]) -> list[dict]:
    """Turn a wide price/arrival table into one record per commodity and date."""
    norm = [_norm_cell(cell) for cell in header]
    index = {name: norm.index(name) for name in set(norm) if name}

    def column(name: str) -> int | None:
        return index.get(name)

    def column_starting(prefix: str) -> int | None:
        # Header cells stack units onto the label, e.g.
        # 'MSP\n(Rs./Quintal)\n2026-27', so match on the prefix.
        return next((i for i, n in enumerate(norm) if n.startswith(prefix)), None)

    group_col, commodity_col = column("commoditygroup"), column("commodity")
    msp_col = column_starting("msp")
    market_col, price_col = column("market"), column("price")
    arrival_col, date_col = column("arrival"), column("date")

    price_cols = [
        (i, _to_iso_date(cell)) for i, cell in enumerate(header)
        if _norm_cell(cell).startswith("priceon")
    ]
    arrival_cols = [
        (i, _to_iso_date(cell)) for i, cell in enumerate(header)
        if _norm_cell(cell).startswith("arrivalon")
    ]

    def cell(row: list, i: int | None) -> str:
        return row[i].strip() if i is not None and i < len(row) else ""

    records: list[dict] = []
    for row in rows:
        commodity = cell(row, commodity_col)
        if not commodity:
            continue
        base = {
            "commodity": commodity,
            "group": cell(row, group_col) or None,
            "market": cell(row, market_col) or None,
            "msp": _to_number(cell(row, msp_col)),
        }
        if price_cols:  # one column per report date
            for i, date in price_cols:
                arrival = next(
                    (row[j].strip() for j, d in arrival_cols if d == date), ""
                )
                records.append(
                    {
                        **base,
                        "date": date,
                        "price": _to_number(cell(row, i)),
                        "arrival": _to_number(arrival),
                    }
                )
        else:  # single price/date per row
            records.append(
                {
                    **base,
                    "date": _to_iso_date(cell(row, date_col)) or cell(row, date_col) or None,
                    "price": _to_number(cell(row, price_col)),
                    "arrival": _to_number(cell(row, arrival_col)),
                }
            )
    return records


def load_market_prices(prices_dir: Path = PRICES_DIR) -> dict:
    """Read the market-wise price & arrival report as structured records.

    Prefers a CSV in the prices folder and otherwise parses the PDF report.
    Returns {"report": {...}, "records": [...], "parse_warning": str | None}.
    """
    if not prices_dir.is_dir():
        raise FileNotFoundError(f"Prices folder not found: {prices_dir}")

    csv_files = sorted(prices_dir.glob("*.csv"))
    source = csv_files[0] if csv_files else None
    if source is None:
        pdfs = sorted(prices_dir.glob("*Price_Arrival*.pdf")) or sorted(
            prices_dir.glob("*.pdf")
        )
        source = pdfs[0] if pdfs else None
    if source is None:
        raise FileNotFoundError(f"No price report (CSV/PDF) found in {prices_dir}")

    header, rows = (
        _table_rows_from_csv(source)
        if source.suffix.lower() == ".csv"
        else _table_rows_from_pdf(source)
    )
    records = _records_from_table(header, rows)

    dates = sorted({r["date"] for r in records if r["date"]})
    return {
        "report": {
            "source_file": str(source.relative_to(DATASETS_DIR)),
            "unit": "Rs./Quintal (price, MSP); Metric Tonnes (arrival)",
            "dates": dates,
            "market_scope": (
                "national aggregate — this report is not broken down by market"
            ),
        },
        "count": len(records),
        "records": records,
        "parse_warning": (
            None
            if records
            else f"No price rows could be parsed from {source.name}; "
            "the report layout may have changed."
        ),
    }


def collection_metadata() -> list[dict]:
    """Return the metadata of every stored chunk (read-only catalogue view)."""
    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR), settings=Settings(anonymized_telemetry=False)
    )
    return client.get_collection(COLLECTION_NAME).get(include=["metadatas"])["metadatas"]


def collection_breakdown() -> dict[str, int]:
    """Count the stored chunks per kind (pdf/pesticide/jsonl/parquet)."""
    counts: dict[str, int] = {}
    for md in collection_metadata():
        kind = md.get("kind", "unknown")
        counts[kind] = counts.get(kind, 0) + 1
    return counts


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):  # dataset text/questions are multilingual
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    embed_and_store()

    breakdown = collection_breakdown()
    print("\nCollection breakdown by kind:")
    for kind, count in sorted(breakdown.items()):
        print(f"  {kind}: {count}")
    print(f"  total: {sum(breakdown.values())}")

    demo_query = "What is PM-KISAN eligibility?"
    print(f"\n--- search({demo_query!r}, top_k=3) ---")
    for i, hit in enumerate(search(demo_query, top_k=3), start=1):
        text = hit["text"]
        preview = text[:400] + (" … [truncated for display]" if len(text) > 400 else "")
        print(
            f"\n[{i}] distance={hit['distance']:.4f} | {hit['metadata']} "
            f"| {len(text.split())} words"
        )
        print(preview)
