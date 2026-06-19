from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.config import settings
from app.database import Base, engine, ensure_pgvector_extension
from app.models import Document, DocumentChunk, User  # noqa: F401


def ensure_document_schema() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("documents"):
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE documents ADD COLUMN IF NOT EXISTS status_message VARCHAR(512)"
            )
        )


def _get_embedding_column_type(connection) -> str | None:
    return connection.execute(
        text(
            """
            SELECT format_type(a.atttypid, a.atttypmod) AS col_type
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema()
              AND c.relname = 'document_chunks'
              AND a.attname = 'embedding'
              AND NOT a.attisdropped
            """
        )
    ).scalar_one_or_none()


def ensure_chunk_embedding_schema() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("document_chunks"):
        return

    dimensions = settings.embedding_dimensions
    expected_type = f"vector({dimensions})"

    with engine.begin() as connection:
        connection.execute(
            text(
                f"ALTER TABLE document_chunks "
                f"ADD COLUMN IF NOT EXISTS embedding vector({dimensions})"
            )
        )

        current_type = _get_embedding_column_type(connection)
        if current_type and current_type != expected_type:
            connection.execute(
                text("DROP INDEX IF EXISTS ix_document_chunks_embedding")
            )
            connection.execute(
                text(
                    f"ALTER TABLE document_chunks "
                    f"ALTER COLUMN embedding TYPE vector({dimensions}) USING NULL"
                )
            )

        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding "
                "ON document_chunks USING hnsw (embedding vector_cosine_ops)"
            )
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    ensure_pgvector_extension()
    Base.metadata.create_all(bind=engine)
    ensure_document_schema()
    ensure_chunk_embedding_schema()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(documents_router, prefix="/documents", tags=["documents"])


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
