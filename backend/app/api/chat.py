import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.chat_message import ChatMessage as ChatMessageModel
from app.models.chat_session import ChatSession
from app.models.document import Document
from app.models.user import User
from app.schemas.chat import (
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    CitationResponse,
)
from app.services.embeddings import EmbeddingError
from app.services.llm import SmartModeRateLimitError
from app.services.rag import ChatGenerationError, run_rag_pipeline
from app.services.model_modes import resolve_model_mode

logger = logging.getLogger(__name__)
router = APIRouter()

CHATABLE_STATUS = "processed"


def get_user_session(
    session_id: uuid.UUID,
    current_user: User,
    db: Session,
) -> ChatSession:
    session = db.scalar(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found",
        )
    return session


def get_processed_documents(
    document_ids: list[uuid.UUID],
    current_user: User,
    db: Session,
) -> list[Document]:
    documents = db.scalars(
        select(Document).where(
            Document.id.in_(document_ids),
            Document.user_id == current_user.id,
        )
    ).all()

    if len(documents) != len(set(document_ids)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more documents were not found",
        )

    not_ready = [doc for doc in documents if doc.status != CHATABLE_STATUS]
    if not_ready:
        names = ", ".join(doc.original_filename for doc in not_ready)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Documents must be processed before chatting: {names}",
        )

    return documents


def _normalize_citation(item: dict) -> dict:
    if "document_filename" not in item and "document_name" in item:
        item = {**item, "document_filename": item["document_name"]}
    return item


def message_to_response(message: ChatMessageModel) -> ChatMessageResponse:
    citations = None
    if message.citations:
        citations = [
            CitationResponse(**_normalize_citation(dict(item)))
            for item in message.citations
        ]

    return ChatMessageResponse(
        id=message.id,
        role=message.role,
        content=message.content,
        citations=citations,
        created_at=message.created_at,
    )


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    if payload.session_id is not None:
        session = get_user_session(payload.session_id, current_user, db)
        document_ids = list(session.document_ids)
    else:
        assert payload.document_ids is not None
        get_processed_documents(payload.document_ids, current_user, db)
        document_ids = list(dict.fromkeys(payload.document_ids))

        session = ChatSession(
            user_id=current_user.id,
            document_ids=document_ids,
            title=None,
        )
        db.add(session)
        db.flush()

    history = [
        (message.role, message.content)
        for message in session.messages
        if message.role in {"user", "assistant"}
    ]

    user_message = ChatMessageModel(
        session_id=session.id,
        role="user",
        content=payload.message,
    )
    db.add(user_message)
    db.flush()

    if session.title is None:
        session.title = payload.message[:255]

    model_mode = resolve_model_mode(payload.model_mode).value

    try:
        rag_result = run_rag_pipeline(
            payload.message,
            document_ids,
            history,
            db,
            model_mode=model_mode,
            conversation_id=str(session.id),
        )
    except EmbeddingError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except SmartModeRateLimitError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except ChatGenerationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    assistant_message = ChatMessageModel(
        session_id=session.id,
        role="assistant",
        content=rag_result.answer,
        citations=rag_result.citations or None,
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)
    db.refresh(session)

    logger.info(
        "Chat response: session_id=%s intent=%s model_mode=%s model_used=%s "
        "retrieved_chunks=%s fallback_retrieval=%s citations_returned=%s",
        session.id,
        rag_result.answer_mode.value,
        rag_result.model_mode,
        rag_result.model_used,
        rag_result.reranked_count,
        rag_result.fallback_retrieval_used,
        rag_result.citations_returned,
    )

    return ChatResponse(
        session_id=session.id,
        user_message=message_to_response(user_message),
        assistant_message=message_to_response(assistant_message),
        model_mode=rag_result.model_mode,  # type: ignore[arg-type]
        model_used=rag_result.model_used,
        fallback_used=rag_result.fallback_used,
        fallback_reason=rag_result.fallback_reason,
    )
