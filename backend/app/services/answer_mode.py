import re
from enum import StrEnum


class AnswerMode(StrEnum):
    FACTUAL = "factual"
    SUMMARY = "summary"
    ANALYSIS = "analysis"
    ADVICE = "advice"
    RESUME_REVIEW = "resume_review"
    PROJECT_REVIEW = "project_review"
    STUDY_HELP = "study_help"
    GENERAL_QUESTION = "general_question"


ANSWER_MODE_TOP_K: dict[AnswerMode, int] = {
    AnswerMode.SUMMARY: 14,
    AnswerMode.ANALYSIS: 14,
    AnswerMode.ADVICE: 14,
    AnswerMode.RESUME_REVIEW: 14,
    AnswerMode.PROJECT_REVIEW: 14,
    AnswerMode.STUDY_HELP: 14,
    AnswerMode.GENERAL_QUESTION: 12,
    AnswerMode.FACTUAL: 7,
}

BROAD_RETRIEVAL_MODES = {
    AnswerMode.SUMMARY,
    AnswerMode.ANALYSIS,
    AnswerMode.ADVICE,
    AnswerMode.RESUME_REVIEW,
    AnswerMode.PROJECT_REVIEW,
    AnswerMode.STUDY_HELP,
    AnswerMode.GENERAL_QUESTION,
}

GENERAL_REASONING_MODES = {
    AnswerMode.ANALYSIS,
    AnswerMode.ADVICE,
    AnswerMode.RESUME_REVIEW,
    AnswerMode.PROJECT_REVIEW,
    AnswerMode.STUDY_HELP,
    AnswerMode.GENERAL_QUESTION,
}

RESUME_REVIEW_PATTERNS = (
    r"\breview (?:this |my )?(?:resume|cv)\b",
    r"\bresume review\b",
    r"\bcv review\b",
    r"\bis (?:this |my )?(?:resume|cv) strong\b",
    r"\b(?:resume|cv) strong\b",
    r"\bfeedback on (?:this |my )?(?:resume|cv)\b",
    r"\brate (?:this |my )?(?:resume|cv)\b",
    r"\bfor recruiters\b",
    r"\brecruiter(?:s)?\b",
)

PROJECT_REVIEW_PATTERNS = (
    r"\b(?:this |the |my )?project\b",
    r"\bproject review\b",
    r"\bimprove (?:this |the |my )?project\b",
    r"\banything i can improve(?: for)?(?: this)? project\b",
    r"\bmake (?:this |the |my )?project better\b",
)

STUDY_HELP_PATTERNS = (
    r"\bstudy notes?\b",
    r"\bmake notes?\b",
    r"\bhelp me study\b",
    r"\bquiz me\b",
    r"\bflashcards?\b",
    r"\bexam prep\b",
    r"\btest me on\b",
    r"\bimportant concepts?\b",
    r"\bkey concepts?\b",
    r"\bidentify concepts?\b",
    r"\bexplain (?:this|the|these|those)\b",
    r"\bbreak (?:this|it) down\b",
    r"\bwalk me through\b",
    r"\bhelp me understand\b",
)

ADVICE_PATTERNS = (
    r"\bhow can i improve\b",
    r"\bhow could i improve\b",
    r"\bhow do i improve\b",
    r"\bhow can i make\b",
    r"\bhow can i get better\b",
    r"\bwhat should i (?:add|improve|change|fix)\b",
    r"\bwhat (?:skills|experience) should i add\b",
    r"\bwhat can i improve\b",
    r"\bis there anything i can improve\b",
    r"\banything i can improve\b",
    r"\bimprove(?:ments?)?\b",
    r"\brecommend(?:ation)?s?\b",
    r"\bsuggest(?:ion)?s?\b",
    r"\badvice\b",
    r"\bwhat could i do\b",
    r"\bmake (?:this|it) better\b",
    r"\bareas to improve\b",
    r"\bweaknesses?\b",
    r"\bstrengths?\b",
)

ANALYSIS_PATTERNS = (
    r"\banalyze\b",
    r"\banalysis\b",
    r"\bevaluate\b",
    r"\bcritique\b",
    r"\bcompare\b",
    r"\bpros and cons\b",
    r"\bwhat are the (?:risks|tradeoffs|trade-offs)\b",
)

SUMMARY_PATTERNS = (
    r"\bwhat(?:'s| is) (?:this|the) (?:document|pdf|file|paper|report|book|text|resume|cv|project) about\b",
    r"\bwhat(?:'s| is) (?:this|the) about\b",
    r"\bsummarize\b",
    r"\bsummary\b",
    r"\boverview\b",
    r"\btell me about (?:this|the)\b",
    r"\bdescribe (?:this|the) (?:document|pdf|file|paper|report|resume|cv|project)\b",
    r"\bwhat does (?:this|the) (?:document|pdf|file|paper|report) (?:cover|discuss|contain|say)\b",
    r"\bgive me (?:a |an )?(?:summary|overview|high[- ]level overview)\b",
    r"\bmain (?:points|ideas|themes|topics|takeaways)\b",
    r"\bkey (?:points|ideas|themes|topics|takeaways)\b",
    r"\bhigh[- ]level (?:summary|overview)\b",
)

FACTUAL_PATTERNS = (
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


def detect_answer_mode(question: str) -> AnswerMode:
    normalized = " ".join(question.lower().split())

    if _matches_any(normalized, RESUME_REVIEW_PATTERNS):
        return AnswerMode.RESUME_REVIEW
    if _matches_any(normalized, PROJECT_REVIEW_PATTERNS):
        return AnswerMode.PROJECT_REVIEW
    if _matches_any(normalized, STUDY_HELP_PATTERNS):
        return AnswerMode.STUDY_HELP
    if _matches_any(normalized, ADVICE_PATTERNS):
        return AnswerMode.ADVICE
    if _matches_any(normalized, ANALYSIS_PATTERNS):
        return AnswerMode.ANALYSIS
    if _matches_any(normalized, SUMMARY_PATTERNS):
        return AnswerMode.SUMMARY
    if _matches_any(normalized, FACTUAL_PATTERNS):
        return AnswerMode.FACTUAL

    if normalized.startswith(("how ", "why ", "should ", "can ", "what ", "is ")):
        return AnswerMode.GENERAL_QUESTION

    return AnswerMode.GENERAL_QUESTION


def get_top_k(mode: AnswerMode) -> int:
    return ANSWER_MODE_TOP_K[mode]


def allows_inference(mode: AnswerMode) -> bool:
    return mode in BROAD_RETRIEVAL_MODES


def allows_general_reasoning(mode: AnswerMode) -> bool:
    return mode in GENERAL_REASONING_MODES


def requires_strict_evidence(mode: AnswerMode) -> bool:
    return mode == AnswerMode.FACTUAL
