import uuid
from dataclasses import dataclass
from typing import Literal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.chunking import chunk_text
from app.services.extraction import PDFExtractionError, PDFNeedsOCRError, extract_text_by_page

ProcessingResult = Literal["processed", "needs_ocr", "failed"]

NEEDS_OCR_MESSAGE = (
    "This PDF appears to be scanned or image-based. OCR support will be added later."
)


@dataclass
class ChunkDraft:
    content: str
    page_number: int
    chunk_index: int


class DocumentProcessingError(Exception):
    pass


class DocumentNotFoundError(Exception):
    pass


def build_chunk_drafts(file_path: str) -> list[ChunkDraft]:
    try:
        pages = extract_text_by_page(file_path)
    except PDFNeedsOCRError:
        raise
    except PDFExtractionError as exc:
        raise DocumentProcessingError(str(exc)) from exc

    drafts: list[ChunkDraft] = []
    chunk_index = 0

    for page_number, page_text in pages:
        for content in chunk_text(page_text):
            drafts.append(
                ChunkDraft(
                    content=content,
                    page_number=page_number,
                    chunk_index=chunk_index,
                )
            )
            chunk_index += 1

    if not drafts:
        raise PDFNeedsOCRError("No meaningful text could be extracted from PDF")

    return drafts


def process_document_by_id(document_id: uuid.UUID, db: Session) -> ProcessingResult:
    """
    Reprocess a document: delete existing chunks, extract, chunk, save.
    Returns "processed", "needs_ocr", or "failed".
    """
    document = db.scalar(select(Document).where(Document.id == document_id))
    if document is None:
        raise DocumentNotFoundError("Document not found")

    db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))

    try:
        drafts = build_chunk_drafts(document.file_path)
        for draft in drafts:
            db.add(
                DocumentChunk(
                    document_id=document.id,
                    content=draft.content,
                    page_number=draft.page_number,
                    chunk_index=draft.chunk_index,
                )
            )
        document.status = "processed"
        document.status_message = None
        result: ProcessingResult = "processed"
    except PDFNeedsOCRError:
        document.status = "needs_ocr"
        document.status_message = NEEDS_OCR_MESSAGE
        result = "needs_ocr"
    except (DocumentProcessingError, Exception):
        document.status = "failed"
        document.status_message = None
        result = "failed"

    db.commit()
    db.refresh(document)
    return result


def process_document(document: Document, db: Session) -> None:
    """Process a document that is already attached to the session."""
    process_document_by_id(document.id, db)
