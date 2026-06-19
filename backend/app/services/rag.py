import logging
import re
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.services.answer_mode import (
    AnswerMode,
    allows_general_reasoning,
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
CITATION_EVIDENCE_MIN_SCORE = 0.18

NOT_FOUND_ANSWER = (
    "I couldn't find that information in the selected document(s)."
)

SYSTEM_PROMPT = """You are LexiAI, an intelligent document assistant.

Your job is to help users understand, analyze, and improve based on their uploaded documents.

Always use the selected document context as the main evidence.

If the user asks for a factual answer, answer only from the document.

If the user asks for advice, improvement, feedback, review, strategy, explanation, or recommendations, you may combine:
1. facts found in the document
2. reasonable general knowledge
3. practical real-world reasoning

When using general reasoning, make it clear that it is your recommendation, not a direct quote from the document.

Avoid saying "I couldn't find that information" unless:
- no document chunks were available
- the user asks for a specific fact that is not in the document

Use a natural, helpful, ChatGPT-like tone.
Do not say "provided excerpts."
Do not say "as an expert."
Use markdown with headings, bullets, and clear structure.
Keep answers grounded, useful, and conversational."""

REASONING_MODE_INSTRUCTION = (
    "Structure your answer with two clear sections when helpful:\n"
    "**From the document:** — facts and observations supported by the passages\n"
    "**My recommendations:** — practical suggestions using general knowledge and reasoning\n\n"
    "Do not invent fake document details (names, dates, employers, metrics).\n"
    "Do not claim recommendations are directly in the PDF unless they are.\n"
    "Do NOT say you couldn't find information — use the document as evidence and give helpful advice."
)

MODE_INSTRUCTIONS: dict[AnswerMode, str] = {
    AnswerMode.FACTUAL: (
        "The user wants a specific factual answer.\n"
        "Answer only from the document context.\n"
        "If the exact fact is missing, say: "
        '"I couldn\'t find that information in the selected document(s)."'
    ),
    AnswerMode.SUMMARY: (
        "The user wants a document summary.\n"
        "Synthesize the passages into a useful overview: document type, purpose, key themes, "
        "important facts, and takeaways.\n"
        "You do not need one exact sentence match — combine information across the passages."
    ),
    AnswerMode.ANALYSIS: (
        "The user wants analysis.\n"
        f"{REASONING_MODE_INSTRUCTION}"
    ),
    AnswerMode.ADVICE: (
        "The user wants advice or improvement suggestions.\n"
        f"{REASONING_MODE_INSTRUCTION}\n"
        "Example: for 'How can I improve this project?', describe what the document already shows, "
        "then suggest credible next steps (tests, docs, deployment, UX, etc.) based on common best practices."
    ),
    AnswerMode.RESUME_REVIEW: (
        "The user wants resume/CV review or recruiter-focused feedback.\n"
        f"{REASONING_MODE_INSTRUCTION}\n"
        "Cover profile, education, experience, projects, skills, strengths, and improvement ideas."
    ),
    AnswerMode.PROJECT_REVIEW: (
        "The user wants project review or improvement ideas.\n"
        f"{REASONING_MODE_INSTRUCTION}\n"
        "Describe what the project document shows, then suggest practical improvements."
    ),
    AnswerMode.STUDY_HELP: (
        "The user wants study help.\n"
        "Explain concepts clearly using the document, and add helpful context from general knowledge "
        "when it aids understanding.\n"
        f"{REASONING_MODE_INSTRUCTION}"
    ),
    AnswerMode.GENERAL_QUESTION: (
        "Answer the user's question using the document as primary evidence.\n"
        "You may add reasonable general knowledge when it makes the answer more useful.\n"
        f"{REASONING_MODE_INSTRUCTION}"
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
        return "No document passages were retrieved."

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


def select_citation_chunks(
    chunks: list[RetrievalResult],
    answer_mode: AnswerMode,
) -> list[RetrievalResult]:
    if not chunks:
        return []

    if requires_strict_evidence(answer_mode):
        return chunks

    evidence = [
        chunk
        for chunk in chunks
        if chunk.score >= CITATION_EVIDENCE_MIN_SCORE
        or chunk.semantic_score >= 0.15
        or chunk.keyword_score >= 0.15
    ]

    if not evidence:
        evidence = sorted(chunks, key=lambda item: item.score, reverse=True)[:5]

    return evidence[:8]


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
        return NOT_FOUND_ANSWER if requires_strict_evidence(answer_mode) else answer.strip()

    cleaned = answer.strip()
    normalized = cleaned.lower()
    if "provided excerpt" in normalized or "as an expert" in normalized:
        cleaned = re.sub(r"(?i)provided excerpts?", "the document", cleaned)
        cleaned = re.sub(r"(?i)as an expert,?\s*", "", cleaned)

    if allows_general_reasoning(answer_mode):
        return cleaned

    if requires_strict_evidence(answer_mode):
        best_score = max(chunk.score for chunk in chunks)
        if best_score < FACTUAL_MIN_RELEVANCE_SCORE and _llm_claims_not_found(cleaned):
            return NOT_FOUND_ANSWER

    return cleaned


def _log_retrieval_debug(
    *,
    conversation_id: str | None,
    document_ids: list,
    question: str,
    answer_mode: AnswerMode,
    model_mode: str,
    retrieval,
) -> None:
    logger.info(
        "RAG debug: conversation_id=%s intent=%s model_mode=%s document_ids=%s question=%r "
        "retrieved_chunks=%s chunks_with_embeddings=%s fallback_retrieval=%s",
        conversation_id,
        answer_mode.value,
        model_mode,
        [str(doc_id) for doc_id in document_ids],
        question,
        len(retrieval.chunks),
        retrieval.chunk_stats.chunks_with_embeddings,
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
        model_mode=resolved_mode.value,
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

    messages = build_chat_messages(question, chunks, history, answer_mode)

    try:
        completion = generate_chat_completion(messages, model_mode=resolved_mode.value)
    except SmartModeRateLimitError:
        raise
    except LLMError as exc:
        raise ChatGenerationError(str(exc)) from exc

    answer = verify_answer(completion.content, chunks, answer_mode)
    citation_chunks = select_citation_chunks(chunks, answer_mode)
    citations = chunks_to_citations(citation_chunks)

    if answer == NOT_FOUND_ANSWER and requires_strict_evidence(answer_mode):
        citations = []

    citations_returned = len(citations) > 0

    logger.info(
        "RAG pipeline complete: conversation_id=%s intent=%s model_mode=%s model_used=%s "
        "retrieved_chunks=%s fallback_retrieval=%s citations_returned=%s",
        conversation_id,
        answer_mode.value,
        completion.model_mode.value,
        completion.model_used,
        len(chunks),
        retrieval.fallback_retrieval_used,
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
