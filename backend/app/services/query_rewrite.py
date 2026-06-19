import re

from app.services.intent import QuestionIntent

STOPWORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "i",
    "me",
    "my",
    "you",
    "your",
    "we",
    "our",
    "they",
    "them",
    "their",
    "he",
    "she",
    "what",
    "which",
    "who",
    "whom",
    "when",
    "where",
    "why",
    "how",
    "about",
    "document",
    "pdf",
    "file",
    "report",
    "paper",
}

INTENT_QUERY_EXPANSIONS: dict[QuestionIntent, list[str]] = {
    QuestionIntent.SUMMARY: [
        "document overview main topics",
        "key themes purpose summary",
    ],
    QuestionIntent.RESUME_REVIEW: [
        "education experience skills projects",
        "work history achievements strengths",
    ],
    QuestionIntent.STUDY_HELP: [
        "important concepts definitions",
        "key ideas examples",
    ],
    QuestionIntent.EXPLANATION: [
        "definition explanation details",
    ],
    QuestionIntent.COMPARISON: [
        "differences similarities comparison",
    ],
}


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        key = item.lower().strip()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(item.strip())
    return result


def _extract_quoted_phrases(question: str) -> list[str]:
    return re.findall(r'"([^"]+)"|\'([^\']+)\'', question)


def _extract_at_phrases(question: str) -> list[str]:
    matches = re.findall(
        r"\bat\s+([A-Z][A-Za-z0-9&\-.]+(?:\s+[A-Z][A-Za-z0-9&\-.]+)*)",
        question,
    )
    return [match.strip() for match in matches if match.strip()]


def _extract_capitalized_phrases(question: str) -> list[str]:
    phrases = re.findall(
        r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b",
        question,
    )
    return [phrase.strip() for phrase in phrases if phrase.strip()]


def _extract_meaningful_terms(question: str) -> list[str]:
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9+\-./']*", question)
    terms: list[str] = []
    for word in words:
        lower = word.lower()
        if lower in STOPWORDS or len(lower) < 3:
            continue
        terms.append(word)
    return terms


def _build_term_queries(terms: list[str]) -> list[str]:
    queries: list[str] = []
    if len(terms) >= 2:
        queries.append(" ".join(terms[:4]))
    for term in terms[:4]:
        if len(term) >= 3:
            queries.append(term)
    return queries


def _extract_role_phrases(question: str) -> list[str]:
    patterns = (
        r"\b(?:software|data|product|research|engineering|marketing|sales)\s+[A-Za-z]+\b",
        r"\b(?:intern(?:ship)?|internship experience|work experience|employment)\b",
        r"\b(?:projects?|achievements?|responsibilities)\b",
    )
    phrases: list[str] = []
    for pattern in patterns:
        phrases.extend(re.findall(pattern, question, re.IGNORECASE))
    return phrases


def rewrite_queries(question: str, intent: QuestionIntent, max_queries: int = 5) -> list[str]:
    normalized = " ".join(question.split())
    queries: list[str] = [normalized]

    for match in _extract_quoted_phrases(question):
        phrase = match[0] or match[1]
        if phrase:
            queries.append(phrase)

    at_phrases = _extract_at_phrases(question)
    queries.extend(at_phrases)
    for org in at_phrases:
        queries.append(f"{org} experience")
        queries.append(f"{org} internship")

    queries.extend(_extract_capitalized_phrases(question))
    queries.extend(_extract_role_phrases(question))

    terms = _extract_meaningful_terms(question)
    queries.extend(_build_term_queries(terms))
    queries.extend(INTENT_QUERY_EXPANSIONS.get(intent, []))

    if intent == QuestionIntent.SPECIFIC_FACT and at_phrases:
        for org in at_phrases:
            queries.append(f"projects at {org}")

    if intent in {QuestionIntent.SUMMARY, QuestionIntent.RESUME_REVIEW}:
        queries.extend(["profile education experience projects skills achievements"])

    deduped = _dedupe_preserve_order(queries)
    target = min(max_queries, max(3, len(deduped)))
    return deduped[:target]
