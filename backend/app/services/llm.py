from groq import Groq

from app.config import settings


class LLMError(Exception):
    pass


def _get_client() -> Groq:
    if not settings.groq_api_key:
        raise LLMError("GROQ_API_KEY is not configured")
    return Groq(api_key=settings.groq_api_key)


def generate_chat_completion(messages: list[dict[str, str]]) -> str:
    """
    Generate a chat response via Groq.
    Used by POST /chat (to be added in a later phase).
    """
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
        )
    except LLMError:
        raise
    except Exception as exc:
        raise LLMError("Failed to generate chat response") from exc

    content = response.choices[0].message.content
    if not content:
        raise LLMError("Groq returned an empty response")
    return content
