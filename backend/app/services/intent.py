import re
from enum import StrEnum


class QuestionIntent(StrEnum):
    SUMMARY = "summary"
    SPECIFIC_FACT = "specific_fact"
    EXPLANATION = "explanation"
    COMPARISON = "comparison"
    STUDY_HELP = "study_help"
    RESUME_REVIEW = "resume_review"
    GENERAL_QUESTION = "general_question"


INTENT_TOP_K: dict[QuestionIntent, int] = {
    QuestionIntent.SUMMARY: 14,
    QuestionIntent.RESUME_REVIEW: 14,
    QuestionIntent.STUDY_HELP: 11,
    QuestionIntent.EXPLANATION: 9,
    QuestionIntent.SPECIFIC_FACT: 6,
    QuestionIntent.COMPARISON: 8,
    QuestionIntent.GENERAL_QUESTION: 7,
}

RESUME_REVIEW_PATTERNS = (
    r"\breview (?:this |my )?(?:resume|cv)\b",
    r"\bresume review\b",
    r"\bcv review\b",
    r"\bfeedback on (?:this |my )?(?:resume|cv)\b",
    r"\brate (?:this |my )?(?:resume|cv)\b",
    r"\bimprove (?:this |my )?(?:resume|cv)\b",
)

STUDY_HELP_PATTERNS = (
    r"\bstudy notes?\b",
    r"\bmake notes?\b",
    r"\bhelp me study\b",
    r"\bquiz me\b",
    r"\bflashcards?\b",
    r"\bexam prep\b",
    r"\btest me on\b",
    r"\blearning guide\b",
)

COMPARISON_PATTERNS = (
    r"\bcompare\b",
    r"\bdifference between\b",
    r"\bvs\.?\b",
    r"\bversus\b",
    r"\bhow (?:do|does) .+ differ\b",
    r"\bsimilarities and differences\b",
)

SUMMARY_PATTERNS = (
    r"\bwhat(?:'s| is) (?:this|the) (?:document|pdf|file|paper|report|book|text) about\b",
    r"\bwhat(?:'s| is) (?:this|the) about\b",
    r"\bsummarize\b",
    r"\bsummary\b",
    r"\boverview\b",
    r"\btell me about (?:this|the) (?:document|pdf|file|paper|report)\b",
    r"\bdescribe (?:this|the) (?:document|pdf|file|paper|report)\b",
    r"\bwhat does (?:this|the) (?:document|pdf|file|paper|report) (?:cover|discuss|contain|say)\b",
    r"\bgive me (?:a |an )?(?:summary|overview|high[- ]level overview)\b",
    r"\bmain (?:points|ideas|themes|topics|takeaways)\b",
    r"\bkey (?:points|ideas|themes|topics|takeaways)\b",
    r"\bwhat(?:'s| is) (?:the )?(?:main|primary) (?:topic|subject|focus|point)\b",
    r"\bhigh[- ]level (?:summary|overview)\b",
)

EXPLANATION_PATTERNS = (
    r"\bexplain\b",
    r"\bhow does\b",
    r"\bhow do\b",
    r"\bwhy does\b",
    r"\bwhy do\b",
    r"\bwhat is the (?:concept|idea|meaning|definition)\b",
    r"\bbreak (?:this|it) down\b",
    r"\bwalk me through\b",
    r"\bhelp me understand\b",
)

SPECIFIC_FACT_PATTERNS = (
    r"\bwhat did (?:he|she|they|it)\b",
    r"\bwhat was\b",
    r"\bwhat were\b",
    r"\bwho (?:is|was|are|were)\b",
    r"\bwhen did\b",
    r"\bwhere did\b",
    r"\bhow much\b",
    r"\bhow many\b",
    r"\blist (?:the|all)\b",
    r"\bfind (?:the|all)\b",
    r"\bdid (?:he|she|they) (?:work|do|study|build|create)\b",
)


def _matches_any(text: str, patterns: tuple[str, ...]) -> bool:
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)


def detect_intent(question: str) -> QuestionIntent:
    normalized = " ".join(question.lower().split())

    if _matches_any(normalized, RESUME_REVIEW_PATTERNS):
        return QuestionIntent.RESUME_REVIEW
    if _matches_any(normalized, STUDY_HELP_PATTERNS):
        return QuestionIntent.STUDY_HELP
    if _matches_any(normalized, COMPARISON_PATTERNS):
        return QuestionIntent.COMPARISON
    if _matches_any(normalized, SUMMARY_PATTERNS):
        return QuestionIntent.SUMMARY
    if _matches_any(normalized, EXPLANATION_PATTERNS):
        return QuestionIntent.EXPLANATION
    if _matches_any(normalized, SPECIFIC_FACT_PATTERNS):
        return QuestionIntent.SPECIFIC_FACT

    return QuestionIntent.GENERAL_QUESTION


def get_top_k(intent: QuestionIntent) -> int:
    return INTENT_TOP_K[intent]
