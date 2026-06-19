import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document_chunk import DocumentChunk
from app.services.embeddings import generate_query_embedding


@dataclass
class SearchResult:
    content: str
    page_number: int
    score: float


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
