from enum import StrEnum

from app.config import settings


class ModelMode(StrEnum):
    FAST = "fast"
    SMART = "smart"


MODEL_MODE_LABELS: dict[ModelMode, str] = {
    ModelMode.FAST: "Fast",
    ModelMode.SMART: "Smart",
}


def resolve_model_mode(value: str | None) -> ModelMode:
    if not value:
        return ModelMode.FAST

    normalized = value.strip().lower()
    try:
        return ModelMode(normalized)
    except ValueError:
        return ModelMode.FAST


def get_groq_model_for_mode(mode: ModelMode) -> str:
    if mode == ModelMode.SMART:
        return settings.groq_model_smart
    return settings.groq_model_fast
