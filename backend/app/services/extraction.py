from pathlib import Path

import fitz

from app.config import settings


class PDFExtractionError(Exception):
    pass


class PDFNeedsOCRError(Exception):
    """PDF has no extractable text (likely scanned or image-only)."""


def get_pdf_absolute_path(file_path: str) -> Path:
    return settings.upload_path / Path(file_path).name


def extract_text_by_page(file_path: str) -> list[tuple[int, str]]:
    absolute_path = get_pdf_absolute_path(file_path)
    if not absolute_path.exists():
        raise PDFExtractionError("PDF file not found on disk")

    pages: list[tuple[int, str]] = []

    try:
        with fitz.open(absolute_path) as pdf:
            for page_index in range(len(pdf)):
                page = pdf[page_index]
                text = page.get_text().strip()
                if text:
                    pages.append((page_index + 1, text))
    except PDFNeedsOCRError:
        raise
    except Exception as exc:
        raise PDFExtractionError("Failed to extract text from PDF") from exc

    if not pages:
        raise PDFNeedsOCRError("No extractable text found in PDF")

    return pages
