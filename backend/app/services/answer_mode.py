import re
from enum import StrEnum


class AnswerMode(StrEnum):
    FACTUAL = "factual"
    SUMMARY = "summary"
    ANALYSIS = "analysis"
    STUDY_HELP = "study_help"


ANSWER_MODE_TOP_K: dict[AnswerMode, int] = {
    AnswerMode.SUMMARY: 14,
    AnswerMode.ANALYSIS: 14,
    AnswerMode.STUDY_HELP: 12,
    AnswerMode.FACTUAL: 7,
}

BROAD_ANSWER_MODES = {AnswerMode.SUMMARY, AnswerMode.ANALYSIS, AnswerMode.STUDY_HELP}

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
    r"\bwhat (?:are|is) the (?:main )?(?:concept|concepts|ideas)\b",
)

ANALYSIS_PATTERNS = (
    r"\bhow can i improve\b",
    r"\bhow could i improve\b",
    r"\bhow do i improve\b",
    r"\bimprove my\b",
    r"\bareas to improve\b",
    r"\bfeedback on\b",
    r"\bstrengths?\b",
    r"\bweaknesses?\b",
    r"\brecommend(?:ation)?s?\b",
    r"\bsuggest(?:ion)?s?\b",
    r"\badvice\b",
    r"\bcritique\b",
    r"\bwhat should i\b",
    r"\bwhat could i\b",
    r"\bhow can i (?:make|strengthen|enhance|better)\b",
    r"\breview (?:this|my)\b",
    r"\bresume review\b",
    r"\bfeedback\b",
    r"\bweak points?\b",
    r"\bimprovements?\b",
)

SUMMARY_PATTERNS = (
    r"\bwhat(?:'s| is) (?:this|the) (?:document|pdf|file|paper|report|book|text|resume|cv) about\b",
    r"\bwhat(?:'s| is) (?:this|the) about\b",
    r"\bsummarize\b",
    r"\bsummary\b",
    r"\boverview\b",
    r"\btell me about (?:this|the)\b",
    r"\bdescribe (?:this|the) (?:document|pdf|file|paper|report|resume|cv)\b",
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

    if _matches_any(normalized, STUDY_HELP_PATTERNS):
        return AnswerMode.STUDY_HELP
    if _matches_any(normalized, ANALYSIS_PATTERNS):
        return AnswerMode.ANALYSIS
    if _matches_any(normalized, SUMMARY_PATTERNS):
        return AnswerMode.SUMMARY
    if _matches_any(normalized, FACTUAL_PATTERNS):
        return AnswerMode.FACTUAL

    if normalized.startswith(("how ", "why ", "what ", "should ", "can ")):
        return AnswerMode.ANALYSIS

    return AnswerMode.FACTUAL


def get_top_k(mode: AnswerMode) -> int:
    return ANSWER_MODE_TOP_K[mode]


def allows_inference(mode: AnswerMode) -> bool:
    return mode in BROAD_ANSWER_MODES


def requires_strict_evidence(mode: AnswerMode) -> bool:
    return mode == AnswerMode.FACTUAL
