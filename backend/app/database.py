from collections.abc import Generator

from pgvector.psycopg2 import register_vector
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_pgvector_extension() -> None:
    """Create the pgvector extension before any vector-typed connections are used."""
    with engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))


# Extension must exist before pgvector type registration on connections.
ensure_pgvector_extension()


@event.listens_for(engine, "connect")
def register_pgvector(dbapi_connection, _connection_record) -> None:
    register_vector(dbapi_connection)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
