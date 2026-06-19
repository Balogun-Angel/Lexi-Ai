import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    original_filename: str
    file_path: str
    status: str
    status_message: str | None = None
    created_at: datetime


class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    content: str
    page_number: int
    chunk_index: int
    created_at: datetime


class DocumentChunkListResponse(BaseModel):
    document_id: uuid.UUID
    chunks: list[DocumentChunkResponse]


class ProcessAllResponse(BaseModel):
    processed: int
    failed: int


class SearchChunkResult(BaseModel):
    content: str
    page_number: int
    score: float


class DocumentSearchResponse(BaseModel):
    document_id: uuid.UUID
    query: str
    results: list[SearchChunkResult]
