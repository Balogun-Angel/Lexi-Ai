import uuid

from app.services.llm import LLMError, generate_chat_completion
from app.services.retrieval import RetrievalResult

SNIPPET_MAX_LENGTH = 240
MAX_HISTORY_MESSAGES = 10

SYSTEM_PROMPT = """You are LexiAI, a helpful assistant that answers questions using only the provided document excerpts.

Rules:
- Base your answer strictly on the excerpts. Do not invent facts.
- If the excerpts do not contain enough information, say you could not find that in the selected documents.
- Be clear and concise.
- When relevant, mention which document or page the information comes from."""


def make_snippet(content: str, max_length: int = SNIPPET_MAX_LENGTH) -> str:
    text = " ".join(content.split())
    if len(text) <= max_length:
        return text
    return text[: max_length - 3].rstrip() + "..."


def build_context_block(chunks: list[RetrievalResult]) -> str:
    if not chunks:
        return "No relevant excerpts were found."

    blocks: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        blocks.append(
            f"[{index}] Document: {chunk.document_name} | Page {chunk.page_number}\n"
            f"{chunk.content}"
        )
    return "\n\n".join(blocks)


def build_chat_messages(
    question: str,
    chunks: list[RetrievalResult],
    history: list[tuple[str, str]],
) -> list[dict[str, str]]:
    context = build_context_block(chunks)
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    for role, content in history[-MAX_HISTORY_MESSAGES:]:
        messages.append({"role": role, "content": content})

    messages.append(
        {
            "role": "user",
            "content": (
                "Use the following excerpts from the selected documents to answer the question.\n\n"
                f"{context}\n\n"
                f"Question: {question}"
            ),
        }
    )
    return messages


def chunks_to_citations(chunks: list[RetrievalResult]) -> list[dict]:
    return [
        {
            "chunk_id": str(chunk.chunk_id),
            "document_id": str(chunk.document_id),
            "document_name": chunk.document_name,
            "page_number": chunk.page_number,
            "snippet": make_snippet(chunk.content),
            "score": chunk.score,
        }
        for chunk in chunks
    ]


def generate_rag_answer(
    question: str,
    chunks: list[RetrievalResult],
    history: list[tuple[str, str]],
) -> str:
    messages = build_chat_messages(question, chunks, history)
    return generate_chat_completion(messages)


class ChatGenerationError(Exception):
    pass


def generate_rag_answer_safe(
    question: str,
    chunks: list[RetrievalResult],
    history: list[tuple[str, str]],
) -> str:
    try:
        return generate_rag_answer(question, chunks, history)
    except LLMError as exc:
        raise ChatGenerationError(str(exc)) from exc
