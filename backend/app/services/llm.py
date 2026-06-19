import logging
from dataclasses import dataclass

from groq import Groq

from app.config import settings
from app.services.model_modes import ModelMode, get_groq_model_for_mode, resolve_model_mode

logger = logging.getLogger(__name__)

SMART_MODE_FALLBACK_REASON = "Smart Mode was limited, so LexiAI answered using Fast Mode."

SMART_MODE_RATE_LIMIT_MESSAGE = (
    "Smart Mode is temporarily limited. Try Fast Mode or wait a moment."
)


class LLMError(Exception):
    pass


class SmartModeRateLimitError(LLMError):
    pass


@dataclass
class LLMCompletionResult:
    content: str
    model_mode: ModelMode
    model_used: str
    fallback_used: bool = False
    fallback_reason: str | None = None


def _get_client() -> Groq:
    if not settings.groq_api_key:
        raise LLMError("GROQ_API_KEY is not configured")
    return Groq(api_key=settings.groq_api_key)


def _is_smart_mode_fallback_error(exc: Exception) -> bool:
    message = str(exc).lower()
    fallback_markers = (
        "rate limit",
        "rate_limit",
        "429",
        "too many requests",
        "503",
        "model",
        "not found",
        "decommissioned",
        "overloaded",
        "unavailable",
    )
    return any(marker in message for marker in fallback_markers)


def _is_retryable_model_error(exc: Exception) -> bool:
    message = str(exc).lower()
    retryable_markers = (
        "rate limit",
        "rate_limit",
        "429",
        "503",
        "model",
        "not found",
        "decommissioned",
        "overloaded",
        "unavailable",
    )
    return any(marker in message for marker in retryable_markers)


def _call_groq(messages: list[dict[str, str]], model: str) -> str:
    client = _get_client()
    response = client.chat.completions.create(
        model=model,
        messages=messages,
    )
    content = response.choices[0].message.content
    if not content:
        raise LLMError("Groq returned an empty response")
    return content


def generate_chat_completion(
    messages: list[dict[str, str]],
    model_mode: str | None = None,
) -> LLMCompletionResult:
    """
    Generate a chat response via Groq for RAG answers.
    Model mode is mapped safely on the backend — never accept raw model names.
    """
    mode = resolve_model_mode(model_mode)
    primary_model = get_groq_model_for_mode(mode)

    try:
        content = _call_groq(messages, primary_model)
        logger.info("Groq completion succeeded: model_mode=%s model_used=%s", mode.value, primary_model)
        return LLMCompletionResult(
            content=content,
            model_mode=mode,
            model_used=primary_model,
        )
    except LLMError:
        raise
    except Exception as exc:
        if mode == ModelMode.SMART and _is_smart_mode_fallback_error(exc):
            fast_model = get_groq_model_for_mode(ModelMode.FAST)
            logger.warning(
                "Smart mode unavailable (%s); retrying once with fast model %s",
                exc,
                fast_model,
            )
            try:
                content = _call_groq(messages, fast_model)
                logger.info(
                    "Groq fallback succeeded: model_mode=smart model_used=%s fallback=true",
                    fast_model,
                )
                return LLMCompletionResult(
                    content=content,
                    model_mode=mode,
                    model_used=fast_model,
                    fallback_used=True,
                    fallback_reason=SMART_MODE_FALLBACK_REASON,
                )
            except LLMError:
                raise
            except Exception as fallback_exc:
                logger.error("Fast mode fallback also failed: %s", fallback_exc)
                raise SmartModeRateLimitError(SMART_MODE_RATE_LIMIT_MESSAGE) from fallback_exc

        if _is_retryable_model_error(exc):
            raise LLMError("Failed to generate chat response") from exc
        raise LLMError("Failed to generate chat response") from exc
