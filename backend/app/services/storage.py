import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings

PDF_CONTENT_TYPES = {"application/pdf", "application/x-pdf", "application/octet-stream"}


def validate_pdf_upload(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    original_filename = Path(file.filename).name
    if not original_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed",
        )

    if file.content_type and file.content_type not in PDF_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed",
        )

    return original_filename


async def save_pdf_upload(file: UploadFile, original_filename: str) -> tuple[str, str]:
    stored_filename = f"{uuid.uuid4()}.pdf"
    destination = settings.upload_path / stored_filename

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if len(contents) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.max_upload_size_mb} MB",
        )

    destination.write_bytes(contents)
    relative_path = f"{settings.upload_dir}/{stored_filename}"
    return stored_filename, relative_path


def get_pdf_absolute_path(file_path: str) -> Path:
    """Return the absolute path for a stored document file_path value."""
    return settings.upload_path / Path(file_path).name


def delete_pdf_file(file_path: str) -> None:
    absolute_path = get_pdf_absolute_path(file_path)
    if absolute_path.exists():
        absolute_path.unlink()
