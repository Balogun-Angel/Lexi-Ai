import re
import uuid
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.embeddings import generate_query_embedding
from app.services.intent import QuestionIntent, get_top_k
from app.services.query_rewrite import rewrite_queries


@dataclass
class SearchResult:
    content: str
    page_number: int
    score: float


@dataclass
class RetrievalResult:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_name: str
    content: str
    page_number: int
    score: float
    semantic_score: float = 0.0
    keyword_score: float = 0.0
    phrase_score: float = 0.0


@dataclass
class RetrievalPipelineResult:
    intent: QuestionIntent
    rewritten_queries: list[str]
    candidate_count: int
    reranked_count: int
    chunks: list[RetrievalResult]


KEYWORD_STOPWORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "what",
    "which",
    "who",
    "whom",
    "when",
    "where",
    "why",
    "how",
    "about",
    "document",
    "pdf",
}


def search_document_chunks(
    document_id: uuid.UUID,
    query: str,
    db: Session,
    limit: int = 5,
) -> list[SearchResult]:
    query_embedding = generate_query_embedding(query)
    distance = DocumentChunk.embedding.cosine_distance(query_embedding)

    rows = db.execute(
        select(
            DocumentChunk.content,
            DocumentChunk.page_number,
            distance.label("distance"),
        )
        .where(
            DocumentChunk.document_id == document_id,
            DocumentChunk.embedding.isnot(None),
        )
        .order_by(distance)
        .limit(limit)
    ).all()

    return [
        SearchResult(
            content=row.content,
            page_number=row.page_number,
            score=max(0.0, 1.0 - float(row.distance)),
        )
        for row in rows
    ]


def _tokenize(text: str) -> set[str]:
    tokens = {
        token.lower()
        for token in re.findall(r"[A-Za-z0-9][A-Za-z0-9+\-./']*", text)
        if len(token) >= 2 and token.lower() not in KEYWORD_STOPWORDS
    }
    return tokens


def _keyword_overlap_score(question: str, content: str) -> float:
    question_tokens = _tokenize(question)
    if not question_tokens:
        return 0.0
    content_tokens = _tokenize(content)
    overlap = len(question_tokens & content_tokens)
    return overlap / len(question_tokens)


def _phrase_match_score(question: str, content: str) -> float:
    content_lower = content.lower()
    question_lower = question.lower()
    score = 0.0

    if len(question_lower) >= 4 and question_lower in content_lower:
        score += 1.0

    quoted = re.findall(r'"([^"]+)"|\'([^\']+)\'', question)
    for match in quoted:
        phrase = (match[0] or match[1]).strip().lower()
        if len(phrase) >= 3 and phrase in content_lower:
            score += 0.75

    at_matches = re.findall(
        r"\bat\s+([A-Z][A-Za-z0-9&\-.]+(?:\s+[A-Z][A-Za-z0-9&\-.]+)*)",
        question,
    )
    for match in at_matches:
        phrase = match.strip().lower()
        if phrase and phrase in content_lower:
            score += 0.75

    capitalized = re.findall(
        r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b",
        question,
    )
    for phrase in capitalized:
        if phrase.lower() in content_lower:
            score += 0.5

    return min(score, 1.0)


def _semantic_search(
    document_ids: list[uuid.UUID],
    query: str,
    db: Session,
    limit: int,
) -> list[RetrievalResult]:
    if not document_ids:
        return []

    query_embedding = generate_query_embedding(query)
    distance = DocumentChunk.embedding.cosine_distance(query_embedding)

    rows = db.execute(
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            DocumentChunk.content,
            DocumentChunk.page_number,
            Document.original_filename,
            distance.label("distance"),
        )
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(
            DocumentChunk.document_id.in_(document_ids),
            DocumentChunk.embedding.isnot(None),
        )
        .order_by(distance)
        .limit(limit)
    ).all()

    return [
        RetrievalResult(
            chunk_id=row.id,
            document_id=row.document_id,
            document_name=row.original_filename,
            content=row.content,
            page_number=row.page_number,
            score=max(0.0, 1.0 - float(row.distance)),
            semantic_score=max(0.0, 1.0 - float(row.distance)),
        )
        for row in rows
    ]


def _keyword_search(
    document_ids: list[uuid.UUID],
    query: str,
    db: Session,
    limit: int,
) -> list[RetrievalResult]:
    if not document_ids:
        return []

    terms = [term for term in _tokenize(query) if len(term) >= 3]
    if not terms:
        return []

    conditions = [DocumentChunk.content.ilike(f"%{term}%") for term in terms[:8]]
    rows = db.execute(
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            DocumentChunk.content,
            DocumentChunk.page_number,
            Document.original_filename,
        )
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(
            DocumentChunk.document_id.in_(document_ids),
            or_(*conditions),
        )
        .limit(limit * 3)
    ).all()

    results: list[RetrievalResult] = []
    for row in rows:
        overlap = _keyword_overlap_score(query, row.content)
        if overlap <= 0:
            continue
        results.append(
            RetrievalResult(
                chunk_id=row.id,
                document_id=row.document_id,
                document_name=row.original_filename,
                content=row.content,
                page_number=row.page_number,
                score=overlap,
                keyword_score=overlap,
            )
        )

    results.sort(key=lambda item: item.keyword_score, reverse=True)
    return results[:limit]


def _merge_candidates(
    existing: dict[uuid.UUID, RetrievalResult],
    incoming: list[RetrievalResult],
) -> None:
    for chunk in incoming:
        current = existing.get(chunk.chunk_id)
        if current is None:
            existing[chunk.chunk_id] = chunk
            continue

        current.semantic_score = max(current.semantic_score, chunk.semantic_score)
        current.keyword_score = max(current.keyword_score, chunk.keyword_score)
        current.score = max(current.score, chunk.score)


def _rerank_candidates(
    candidates: list[RetrievalResult],
    question: str,
) -> list[RetrievalResult]:
    reranked: list[RetrievalResult] = []
    for chunk in candidates:
        keyword_score = max(chunk.keyword_score, _keyword_overlap_score(question, chunk.content))
        phrase_score = _phrase_match_score(question, chunk.content)
        final_score = (
            0.55 * chunk.semantic_score
            + 0.30 * keyword_score
            + 0.15 * phrase_score
        )
        reranked.append(
            RetrievalResult(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                document_name=chunk.document_name,
                content=chunk.content,
                page_number=chunk.page_number,
                score=final_score,
                semantic_score=chunk.semantic_score,
                keyword_score=keyword_score,
                phrase_score=phrase_score,
            )
        )

    reranked.sort(key=lambda item: item.score, reverse=True)
    return reranked


def _select_with_page_diversity(
    ranked: list[RetrievalResult],
    top_k: int,
) -> list[RetrievalResult]:
    selected: list[RetrievalResult] = []
    page_counts: dict[tuple[uuid.UUID, int], int] = {}

    for chunk in ranked:
        if len(selected) >= top_k:
            break
        page_key = (chunk.document_id, chunk.page_number)
        if page_counts.get(page_key, 0) >= 2 and len(selected) >= max(3, top_k // 2):
            continue
        selected.append(chunk)
        page_counts[page_key] = page_counts.get(page_key, 0) + 1

    if len(selected) < top_k:
        selected_ids = {item.chunk_id for item in selected}
        for chunk in ranked:
            if len(selected) >= top_k:
                break
            if chunk.chunk_id not in selected_ids:
                selected.append(chunk)
                selected_ids.add(chunk.chunk_id)

    return selected[:top_k]


def search_chunks_across_documents(
    document_ids: list[uuid.UUID],
    query: str,
    db: Session,
    limit: int = 5,
) -> list[RetrievalResult]:
    return _semantic_search(document_ids, query, db, limit)


def retrieve_and_rerank(
    document_ids: list[uuid.UUID],
    question: str,
    intent: QuestionIntent,
    db: Session,
) -> RetrievalPipelineResult:
    rewritten_queries = rewrite_queries(question, intent)
    top_k = get_top_k(intent)
    candidate_limit = max(top_k * 3, 20)

    candidates: dict[uuid.UUID, RetrievalResult] = {}

    for search_query in rewritten_queries:
        semantic_results = _semantic_search(
            document_ids,
            search_query,
            db,
            limit=candidate_limit,
        )
        keyword_results = _keyword_search(
            document_ids,
            search_query,
            db,
            limit=candidate_limit,
        )
        _merge_candidates(candidates, semantic_results)
        _merge_candidates(candidates, keyword_results)

    candidate_list = list(candidates.values())
    reranked = _rerank_candidates(candidate_list, question)
    final_chunks = _select_with_page_diversity(reranked, top_k)

    return RetrievalPipelineResult(
        intent=intent,
        rewritten_queries=rewritten_queries,
        candidate_count=len(candidate_list),
        reranked_count=len(final_chunks),
        chunks=final_chunks,
    )
