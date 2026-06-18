from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.config import settings
from app.database import Base, engine
from app.models import Document, DocumentChunk, User  # noqa: F401


def ensure_document_schema() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("documents"):
        return

    column_names = {column["name"] for column in inspector.get_columns("documents")}
    if "status_message" not in column_names:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE documents ADD COLUMN status_message VARCHAR(512)")
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    ensure_document_schema()
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
