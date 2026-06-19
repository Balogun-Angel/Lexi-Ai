import logging
import re
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.services.answer_mode import (
    AnswerMode,
    detect_answer_mode,
    requires_strict_evidence,
)
from app.services.llm import LLMError, SmartModeRateLimitError, generate_chat_completion
from app.services.model_modes import resolve_model_mode
from app.services.retrieval import RetrievalResult, retrieve_and_rerank

logger = logging.getLogger(__name__)

SNIPPET_MAX_LENGTH = 240
MAX_HISTORY_MESSAGES = 6
FACTUAL_MIN_RELEVANCE_SCORE = 0.12

NOT_FOUND_ANSWER = (
    "I couldn't find that information in the selected document(s)."
)

SYSTEM_PROMPT = """You are LexiAI, an intelligent PDF research assistant. Help users understand, summarize, and learn from their uploaded documents with accuracy, clarity, and useful reasoning.

General rules:
- Sound natural, helpful, and conversational — not robotic.
- Use markdown with headings, short paragraphs, bullet points, and **bold** key terms.
- Reference source numbers or page numbers when helpful.
- Do not invent facts that are not supported by the document context.
- Do not say "provided excerpts" or "as an expert".
- Citation cards are added separately; still mention sources when useful."""

MODE_INSTRUCTIONS: dict[AnswerMode, str] = {
    AnswerMode.FACTUAL: (
        "Answer mode: factual lookup.\n"
        "Answer only if the document context supports the specific fact requested.\n"
        "If the exact fact is missing, say clearly: "
        '"I couldn\'t find that information in the selected document(s)."\n'
        "Be direct and concise."
    ),
    AnswerMode.SUMMARY: (
        "Answer mode: document summary.\n"
        "Use the retrieved passages to produce a useful document-level summary.\n"
        "Identify the document type, main purpose, key themes, important facts, and takeaways.\n"
        "You do not need one exact sentence match — synthesize across the passages.\n"
        "For resumes/CVs, cover profile, education, experience, projects, skills, and achievements."
    ),
    AnswerMode.ANALYSIS: (
        "Answer mode: analysis and advice.\n"
        "Use the document as your evidence base.\n"
        "You may offer reasonable recommendations, strengths, weaknesses, and improvements based on "
        "what the document shows.\n"
        "Phrase advice clearly, e.g. 'Based on this document...', 'One improvement could be...', "
        "'Your resume shows strength in...'.\n"
        "Do not invent credentials, employers, dates, or achievements that are not in the document.\n"
        "Example: for 'How can I improve my skills?' on a resume, highlight existing strengths and "
        "suggest credible next steps grounded in what is already shown."
    ),
    AnswerMode.STUDY_HELP: (
        "Answer mode: study help.\n"
        "Explain concepts clearly, break ideas down, and highlight the most important points.\n"
        "Create useful notes, identify key concepts, and help the user learn from the document.\n"
        "Use examples from the document when available."
    ),
}


@dataclass
class RAGPipelineResult:
    answer: str
    citations: list[dict]
    answer_mode: AnswerMode
    rewritten_queries: list[str]
    candidate_count: int
    reranked_count: int
    model_mode: str
    model_used: str | None
    fallback_used: bool
    fallback_reason: str | None
    citations_returned: bool
    fallback_retrieval_used: bool


def make_snippet(content: str, max_length: int = SNIPPET_MAX_LENGTH) -> str:
    text = " ".join(content.split())
    if len(text) <= max_length:
        return text
    return text[: max_length - 3].rstrip() + "..."


def build_context_block(chunks: list[RetrievalResult]) -> str:
    if not chunks:
        return "No relevant document context was found."

    blocks: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        blocks.append(
            f"[Source {index} | Document: {chunk.document_name} | Page: {chunk.page_number} | "
            f"Chunk ID: {chunk.chunk_id}]\n"
            f"{chunk.content}"
        )
    return "\n\n".join(blocks)


def build_chat_messages(
    question: str,
    chunks: list[RetrievalResult],
    history: list[tuple[str, str]],
    answer_mode: AnswerMode,
) -> list[dict[str, str]]:
    context = build_context_block(chunks)
    mode_instruction = MODE_INSTRUCTIONS[answer_mode]

    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    for role, content in history[-MAX_HISTORY_MESSAGES:]:
        messages.append({"role": role, "content": content})

    messages.append(
        {
            "role": "user",
            "content": (
                f"{mode_instruction}\n\n"
                "Document context:\n"
                f"{context}\n\n"
                f"User question: {question}"
            ),
        }
    )
    return messages


def chunks_to_citations(chunks: list[RetrievalResult]) -> list[dict]:
    return [
        {
            "chunk_id": str(chunk.chunk_id),
            "document_id": str(chunk.document_id),
            "document_filename": chunk.document_name,
            "page_number": chunk.page_number,
            "snippet": make_snippet(chunk.content),
            "score": round(chunk.score, 4),
        }
        for chunk in chunks
    ]


def _answer_references_sources(answer: str) -> bool:
    patterns = (
        r"\bsource\s+\d+\b",
        r"\bpage\s+\d+\b",
        r"\[\d+\]",
        r"\bsources?\b",
    )
    return any(re.search(pattern, answer, re.IGNORECASE) for pattern in patterns)


def _llm_claims_not_found(answer: str) -> bool:
    normalized = answer.lower()
    markers = (
        "i couldn't find",
        "could not find",
        "not found in the selected document",
        "no information in the selected document",
    )
    return any(marker in normalized for marker in markers)


def verify_answer(
    answer: str,
    chunks: list[RetrievalResult],
    answer_mode: AnswerMode,
) -> str:
    if not chunks:
        return NOT_FOUND_ANSWER

    if not answer.strip():
        return NOT_FOUND_ANSWER

    normalized = answer.lower()
    if "provided excerpt" in normalized or "as an expert" in normalized:
        answer = re.sub(r"(?i)provided excerpts?", "the document", answer)
        answer = re.sub(r"(?i)as an expert,?\s*", "", answer)

    if requires_strict_evidence(answer_mode):
        best_score = max(chunk.score for chunk in chunks)
        if best_score < FACTUAL_MIN_RELEVANCE_SCORE and _llm_claims_not_found(answer):
            return NOT_FOUND_ANSWER
        if best_score < FACTUAL_MIN_RELEVANCE_SCORE and not _llm_claims_not_found(answer):
            return answer.strip()

    return answer.strip()


def _log_retrieval_debug(
    *,
    conversation_id: str | None,
    document_ids: list,
    question: str,
    answer_mode: AnswerMode,
    retrieval,
) -> None:
    top_chunks = [
        {
            "chunk_id": str(chunk.chunk_id),
            "document_id": str(chunk.document_id),
            "page_number": chunk.page_number,
            "score": round(chunk.score, 4),
            "snippet": make_snippet(chunk.content, 80),
        }
        for chunk in retrieval.chunks[:5]
    ]

    logger.info(
        "RAG debug: conversation_id=%s document_ids=%s question=%r answer_mode=%s "
        "chunks_found=%s chunks_with_embeddings=%s top_chunks=%s fallback_retrieval=%s",
        conversation_id,
        [str(doc_id) for doc_id in document_ids],
        question,
        answer_mode.value,
        retrieval.chunk_stats.total_chunks,
        retrieval.chunk_stats.chunks_with_embeddings,
        top_chunks,
        retrieval.fallback_retrieval_used,
    )


class ChatGenerationError(Exception):
    pass


def run_rag_pipeline(
    question: str,
    document_ids: list,
    history: list[tuple[str, str]],
    db: Session,
    model_mode: str | None = None,
    conversation_id: str | None = None,
) -> RAGPipelineResult:
    resolved_mode = resolve_model_mode(model_mode)
    answer_mode = detect_answer_mode(question)
    retrieval = retrieve_and_rerank(document_ids, question, answer_mode, db)
    chunks = retrieval.chunks

    _log_retrieval_debug(
        conversation_id=conversation_id,
        document_ids=document_ids,
        question=question,
        answer_mode=answer_mode,
        retrieval=retrieval,
    )

    if not chunks:
        logger.info("RAG pipeline: no chunks available for selected documents")
        return RAGPipelineResult(
            answer=NOT_FOUND_ANSWER,
            citations=[],
            answer_mode=answer_mode,
            rewritten_queries=retrieval.rewritten_queries,
            candidate_count=retrieval.candidate_count,
            reranked_count=0,
            model_mode=resolved_mode.value,
            model_used=None,
            fallback_used=False,
            fallback_reason=None,
            citations_returned=False,
            fallback_retrieval_used=retrieval.fallback_retrieval_used,
        )

    if requires_strict_evidence(answer_mode):
        best_score = max(chunk.score for chunk in chunks)
        if best_score < FACTUAL_MIN_RELEVANCE_SCORE:
            logger.info(
                "RAG pipeline: factual question with low relevance (best_score=%.3f)",
                best_score,
            )

    messages = build_chat_messages(question, chunks, history, answer_mode)

    try:
        completion = generate_chat_completion(messages, model_mode=resolved_mode.value)
    except SmartModeRateLimitError:
        raise
    except LLMError as exc:
        raise ChatGenerationError(str(exc)) from exc

    answer = verify_answer(completion.content, chunks, answer_mode)
    citations = chunks_to_citations(chunks)

    if answer == NOT_FOUND_ANSWER and requires_strict_evidence(answer_mode):
        citations = []

    citations_returned = len(citations) > 0
    if citations_returned and not _answer_references_sources(answer):
        logger.info(
            "RAG pipeline: attaching %s citation cards",
            len(citations),
        )

    logger.info(
        "RAG pipeline complete: conversation_id=%s answer_mode=%s model_mode=%s "
        "model_used=%s fallback=%s citations_returned=%s",
        conversation_id,
        answer_mode.value,
        completion.model_mode.value,
        completion.model_used,
        completion.fallback_used,
        citations_returned,
    )

    return RAGPipelineResult(
        answer=answer,
        citations=citations,
        answer_mode=answer_mode,
        rewritten_queries=retrieval.rewritten_queries,
        candidate_count=retrieval.candidate_count,
        reranked_count=retrieval.reranked_count,
        model_mode=completion.model_mode.value,
        model_used=completion.model_used,
        fallback_used=completion.fallback_used,
        fallback_reason=completion.fallback_reason,
        citations_returned=citations_returned,
        fallback_retrieval_used=retrieval.fallback_retrieval_used,
    )
