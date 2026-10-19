"""Realtime model factory. OpenAI plugin first, Inference fallback. See ADR-024."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass

from livekit.agents import inference
from livekit.agents.llm import RealtimeModelFallbackAdapter
from livekit.agents.llm.realtime import RealtimeModel
from livekit.plugins import openai

logger = logging.getLogger("agent")

ALLOWED_PROVIDERS = frozenset({"openai", "inference"})
DEFAULT_PROVIDERS = ("openai", "inference")
DEFAULT_MODEL = "gpt-realtime-2.1"
DEFAULT_VOICE = "marin"


@dataclass(frozen=True)
class RealtimeConfig:
    providers: tuple[str, ...]
    model_id: str


def parse_realtime_providers() -> tuple[str, ...]:
    """Parse REALTIME_PROVIDERS (comma list). Default openai,inference."""
    raw = os.environ.get("REALTIME_PROVIDERS")
    if raw is None:
        names = DEFAULT_PROVIDERS
    else:
        names = tuple(part.strip() for part in raw.split(","))

    if not names or any(not name for name in names):
        raise ValueError(
            "REALTIME_PROVIDERS is empty. Expected a comma list of 'openai' and/or 'inference'."
        )

    unknown = [name for name in names if name not in ALLOWED_PROVIDERS]
    if unknown:
        raise ValueError(
            f"Unknown REALTIME_PROVIDERS entry {unknown[0]!r}. "
            "Expected 'openai' or 'inference'."
        )
    return names


def load_realtime_config() -> RealtimeConfig:
    providers = parse_realtime_providers()
    raw_model = os.environ.get("REALTIME_MODEL")
    if raw_model is None:
        model_id = DEFAULT_MODEL
    else:
        model_id = raw_model.strip()
        if not model_id:
            raise ValueError("REALTIME_MODEL is empty. Set a realtime model id.")

    if "openai" in providers and not os.environ.get("OPENAI_API_KEY", "").strip():
        raise ValueError(
            "OPENAI_API_KEY is required when REALTIME_PROVIDERS includes openai. "
            "Set it in .env, or drop openai from REALTIME_PROVIDERS to use LiveKit Inference only."
        )
    return RealtimeConfig(providers=providers, model_id=model_id)


def _openai_model(model_id: str) -> RealtimeModel:
    return openai.realtime.RealtimeModel(
        model=model_id,
        voice=DEFAULT_VOICE,
    )


def _inference_model(model_id: str) -> RealtimeModel:
    inference_model = model_id if "/" in model_id else f"openai/{model_id}"
    return inference.RealtimeModel(
        model=inference_model,
        voice=DEFAULT_VOICE,
    )


def build_realtime_model(config: RealtimeConfig | None = None) -> RealtimeModel:
    """Build the session realtime model from REALTIME_PROVIDERS and REALTIME_MODEL.

    One provider returns that model directly. Two or more return
    RealtimeModelFallbackAdapter with the models in list order. Both plugin and
    Inference defaults agree on audio_output, turn_detection, and
    supports_overlapping_speech, which the adapter requires.
    """
    config = config or load_realtime_config()
    providers = config.providers
    model_id = config.model_id

    builders = {
        "openai": _openai_model,
        "inference": _inference_model,
    }
    models = [builders[name](model_id) for name in providers]
    model: RealtimeModel
    if len(models) == 1:
        model = models[0]
    else:
        model = RealtimeModelFallbackAdapter(models=models)

    model_rows = [
        {
            "class": f"{type(item).__module__}.{type(item).__qualname__}",
            "provider": item.provider,
            "model_id": item.model,
        }
        for item in models
    ]
    logger.info(
        json.dumps(
            {
                "event": "realtime_model_built",
                "providers": providers,
                "class": f"{type(model).__module__}.{type(model).__qualname__}",
                "model_id": model.model,
                "fallbacks": model_rows,
            }
        )
    )
    return model
