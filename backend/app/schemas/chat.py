from typing import Literal

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CitationResponse(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_filename: str
    page_number: int
    snippet: str
    score: float


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    content: str
    citations: list[CitationResponse] | None = None
    created_at: datetime


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    document_ids: list[uuid.UUID] | None = None
    session_id: uuid.UUID | None = None
    model_mode: Literal["fast", "smart"] | None = None

    @model_validator(mode="after")
    def validate_session_or_documents(self) -> "ChatRequest":
        if self.session_id is None and not self.document_ids:
            raise ValueError("document_ids is required when starting a new chat session")
        if self.document_ids is not None and len(self.document_ids) == 0:
            raise ValueError("document_ids must include at least one document")
        return self


class ChatResponse(BaseModel):
    session_id: uuid.UUID
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse
    model_mode: Literal["fast", "smart"]
    model_used: str | None = None
    fallback_used: bool = False
    fallback_reason: str | None = None
