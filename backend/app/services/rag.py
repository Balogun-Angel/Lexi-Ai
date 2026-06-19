import logging
import re
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.services.intent import QuestionIntent, detect_intent
from app.services.llm import LLMError, SmartModeRateLimitError, generate_chat_completion
from app.services.model_modes import resolve_model_mode
from app.services.retrieval import RetrievalResult, retrieve_and_rerank

logger = logging.getLogger(__name__)

SNIPPET_MAX_LENGTH = 240
MAX_HISTORY_MESSAGES = 6
MIN_RELEVANCE_SCORE = 0.18

NOT_FOUND_ANSWER = (
    "I couldn't find that information in the selected document(s)."
)

SYSTEM_PROMPT = """You are LexiAI, an intelligent PDF research assistant. Your job is to help users understand their uploaded documents with accuracy, clarity, and useful reasoning.

Rules:
- Answer only using the provided document context.
- Do not invent facts.
- Do not say "provided excerpts" or "as an expert".
- Sound natural, helpful, and conversational.
- If the answer is not supported by the document context, say clearly: "I couldn't find that information in the selected document(s)."
- For summaries, identify the document type, main purpose, key themes, important facts, and takeaways.
- For resumes, summarize profile, education, experience, projects, technical skills, strengths, and possible improvements if asked.
- For study questions, explain clearly and break down concepts.
- For comparisons, use a table when helpful.
- Use markdown formatting with headings, bullets, and bold key terms.
- Include citations using the source numbers or page numbers from the context."""

INTENT_INSTRUCTIONS: dict[QuestionIntent, str] = {
    QuestionIntent.SUMMARY: (
        "The user wants a broad overview. Identify the document type and give a structured summary "
        "with key themes, important facts, and takeaways."
    ),
    QuestionIntent.RESUME_REVIEW: (
        "The user is asking about a resume/CV. Cover profile, education, experience, projects, "
        "technical skills, achievements, and strengths when available."
    ),
    QuestionIntent.STUDY_HELP: (
        "The user wants study help. Explain clearly, break concepts down, and highlight the most "
        "important points to remember."
    ),
    QuestionIntent.EXPLANATION: (
        "The user wants an explanation. Define the concept, explain how it works, and use examples "
        "from the document when available."
    ),
    QuestionIntent.COMPARISON: (
        "The user wants a comparison. Compare the relevant items clearly; use a markdown table if helpful."
    ),
    QuestionIntent.SPECIFIC_FACT: (
        "The user asked a specific factual question. Answer directly first, then add supporting "
        "detail from the document."
    ),
    QuestionIntent.GENERAL_QUESTION: (
        "Answer the user's question directly using the document context."
    ),
}


@dataclass
class RAGPipelineResult:
    answer: str
    citations: list[dict]
    intent: QuestionIntent
    rewritten_queries: list[str]
    candidate_count: int
    reranked_count: int
    model_mode: str
    model_used: str | None
    fallback_used: bool
    fallback_reason: str | None
    citations_returned: bool


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
    intent: QuestionIntent,
) -> list[dict[str, str]]:
    context = build_context_block(chunks)
    intent_instruction = INTENT_INSTRUCTIONS[intent]

    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    for role, content in history[-MAX_HISTORY_MESSAGES:]:
        messages.append({"role": role, "content": content})

    messages.append(
        {
            "role": "user",
            "content": (
                f"{intent_instruction}\n\n"
                "Document context:\n"
                f"{context}\n\n"
                f"User question: {question}\n\n"
                "Answer using only the document context above. Reference source numbers or page "
                "numbers when helpful."
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


def _answer_claims_unsupported_facts(answer: str) -> bool:
    unsupported_markers = (
        "i couldn't find",
        "could not find",
        "not found in the selected document",
        "no information",
        "don't have enough",
        "do not have enough",
    )
    normalized = answer.lower()
    return not any(marker in normalized for marker in unsupported_markers)


def verify_answer(
    answer: str,
    chunks: list[RetrievalResult],
) -> str:
    if not chunks:
        return NOT_FOUND_ANSWER

    best_score = max(chunk.score for chunk in chunks)
    if best_score < MIN_RELEVANCE_SCORE:
        return NOT_FOUND_ANSWER

    if not answer.strip():
        return NOT_FOUND_ANSWER

    normalized = answer.lower()
    if _answer_claims_unsupported_facts(answer) and best_score < 0.35:
        return NOT_FOUND_ANSWER

    if "provided excerpt" in normalized or "as an expert" in normalized:
        answer = re.sub(r"(?i)provided excerpts?", "the document", answer)
        answer = re.sub(r"(?i)as an expert,?\s*", "", answer)

    return answer.strip()


class ChatGenerationError(Exception):
    pass


def run_rag_pipeline(
    question: str,
    document_ids: list,
    history: list[tuple[str, str]],
    db: Session,
    model_mode: str | None = None,
) -> RAGPipelineResult:
    resolved_mode = resolve_model_mode(model_mode)
    intent = detect_intent(question)
    retrieval = retrieve_and_rerank(document_ids, question, intent, db)
    chunks = retrieval.chunks

    logger.info(
        "RAG retrieval: intent=%s queries=%s candidates=%s reranked=%s document_ids=%s",
        intent.value,
        retrieval.rewritten_queries,
        retrieval.candidate_count,
        retrieval.reranked_count,
        [str(doc_id) for doc_id in document_ids],
    )

    if not chunks:
        logger.info("RAG pipeline: no chunks retrieved, returning not-found answer")
        return RAGPipelineResult(
            answer=NOT_FOUND_ANSWER,
            citations=[],
            intent=intent,
            rewritten_queries=retrieval.rewritten_queries,
            candidate_count=retrieval.candidate_count,
            reranked_count=0,
            model_mode=resolved_mode.value,
            model_used=None,
            fallback_used=False,
            fallback_reason=None,
            citations_returned=False,
        )

    best_score = max(chunk.score for chunk in chunks)
    if best_score < MIN_RELEVANCE_SCORE:
        logger.info(
            "RAG pipeline: low relevance (best_score=%.3f), returning not-found answer",
            best_score,
        )
        return RAGPipelineResult(
            answer=NOT_FOUND_ANSWER,
            citations=[],
            intent=intent,
            rewritten_queries=retrieval.rewritten_queries,
            candidate_count=retrieval.candidate_count,
            reranked_count=retrieval.reranked_count,
            model_mode=resolved_mode.value,
            model_used=None,
            fallback_used=False,
            fallback_reason=None,
            citations_returned=False,
        )

    messages = build_chat_messages(question, chunks, history, intent)

    try:
        completion = generate_chat_completion(messages, model_mode=resolved_mode.value)
    except SmartModeRateLimitError:
        raise
    except LLMError as exc:
        raise ChatGenerationError(str(exc)) from exc

    answer = verify_answer(completion.content, chunks)
    citations = chunks_to_citations(chunks)

    if answer == NOT_FOUND_ANSWER:
        citations = []

    citations_returned = len(citations) > 0
    if citations_returned and not _answer_references_sources(answer):
        logger.info(
            "RAG pipeline: answer lacks inline source refs; attaching %s citation cards",
            len(citations),
        )

    logger.info(
        "RAG pipeline complete: model_mode=%s model_used=%s fallback=%s citations_returned=%s intent=%s",
        completion.model_mode.value,
        completion.model_used,
        completion.fallback_used,
        citations_returned,
        intent.value,
    )

    return RAGPipelineResult(
        answer=answer,
        citations=citations,
        intent=intent,
        rewritten_queries=retrieval.rewritten_queries,
        candidate_count=retrieval.candidate_count,
        reranked_count=retrieval.reranked_count,
        model_mode=completion.model_mode.value,
        model_used=completion.model_used,
        fallback_used=completion.fallback_used,
        fallback_reason=completion.fallback_reason,
        citations_returned=citations_returned,
    )
