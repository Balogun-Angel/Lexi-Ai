import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database import get_db
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.user import User
from app.schemas.document import (
    DocumentChunkListResponse,
    DocumentChunkResponse,
    DocumentResponse,
    DocumentSearchResponse,
    ProcessAllResponse,
    SearchChunkResult,
)
from app.services.embeddings import EmbeddingError
from app.services.processing import DocumentNotFoundError, process_document_by_id
from app.services.retrieval import search_document_chunks
from app.services.storage import (
    delete_pdf_file,
    get_pdf_absolute_path,
    save_pdf_upload,
    validate_pdf_upload,
)

REPROCESSABLE_STATUSES = ("uploaded", "failed")

router = APIRouter()


def get_user_document(
    document_id: uuid.UUID,
    current_user: User,
    db: Session,
) -> Document:
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
        )
    )
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return document


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    original_filename = validate_pdf_upload(file)
    stored_filename, file_path = await save_pdf_upload(file, original_filename)

    document = Document(
        user_id=current_user.id,
        filename=stored_filename,
        original_filename=original_filename,
        file_path=file_path,
        status="uploaded",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    process_document_by_id(document.id, db)
    db.refresh(document)
    return DocumentResponse.model_validate(document)


@router.post("/process-all", response_model=ProcessAllResponse)
def process_all_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProcessAllResponse:
    documents = db.scalars(
        select(Document)
        .where(
            Document.user_id == current_user.id,
            Document.status.in_(REPROCESSABLE_STATUSES),
        )
        .order_by(Document.created_at.asc())
    ).all()

    processed = 0
    failed = 0

    for document in documents:
        result = process_document_by_id(document.id, db)
        if result == "processed":
            processed += 1
        elif result == "failed":
            failed += 1

    return ProcessAllResponse(processed=processed, failed=failed)


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DocumentResponse]:
    documents = db.scalars(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    ).all()
    return [DocumentResponse.model_validate(doc) for doc in documents]


@router.get("/{document_id}/file")
def get_document_file(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    document = get_user_document(document_id, current_user, db)
    absolute_path = get_pdf_absolute_path(document.file_path)

    if not absolute_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found on disk",
        )

    return FileResponse(
        path=absolute_path,
        media_type="application/pdf",
        filename=document.original_filename,
    )


@router.get("/{document_id}/search", response_model=DocumentSearchResponse)
def search_document(
    document_id: uuid.UUID,
    query: str = Query(..., min_length=1, max_length=2000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentSearchResponse:
    document = get_user_document(document_id, current_user, db)

    if document.status != "processed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document must be processed before searching",
        )

    try:
        results = search_document_chunks(document.id, query, db, limit=5)
    except EmbeddingError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return DocumentSearchResponse(
        document_id=document.id,
        query=query,
        results=[
            SearchChunkResult(
                content=result.content,
                page_number=result.page_number,
                score=result.score,
            )
            for result in results
        ],
    )


@router.get("/{document_id}/chunks", response_model=DocumentChunkListResponse)
def list_document_chunks(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentChunkListResponse:
    document = get_user_document(document_id, current_user, db)
    chunks = db.scalars(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document.id)
        .order_by(DocumentChunk.chunk_index.asc())
    ).all()

    return DocumentChunkListResponse(
        document_id=document.id,
        chunks=[DocumentChunkResponse.model_validate(chunk) for chunk in chunks],
    )


@router.post("/{document_id}/process", response_model=DocumentResponse)
def process_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    get_user_document(document_id, current_user, db)

    try:
        process_document_by_id(document_id, db)
    except DocumentNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        ) from exc

    document = get_user_document(document_id, current_user, db)
    return DocumentResponse.model_validate(document)


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentResponse:
    document = get_user_document(document_id, current_user, db)
    return DocumentResponse.model_validate(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    document = get_user_document(document_id, current_user, db)
    delete_pdf_file(document.file_path)
    db.delete(document)
    db.commit()
