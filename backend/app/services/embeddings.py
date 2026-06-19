from sentence_transformers import SentenceTransformer

from app.config import settings

_model: SentenceTransformer | None = None


class EmbeddingError(Exception):
    pass


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer(settings.local_embedding_model)
        except Exception as exc:
            raise EmbeddingError(
                f"Failed to load embedding model '{settings.local_embedding_model}'"
            ) from exc
    return _model


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    try:
        model = _get_model()
        vectors = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return [vector.tolist() for vector in vectors]
    except EmbeddingError:
        raise
    except Exception as exc:
        raise EmbeddingError("Failed to generate local embeddings") from exc


def generate_query_embedding(query: str) -> list[float]:
    embeddings = generate_embeddings([query.strip()])
    if not embeddings:
        raise EmbeddingError("Failed to embed query")
    return embeddings[0]
