import json

import pytest
from livekit.agents import inference
from livekit.agents.llm import RealtimeModelFallbackAdapter
from livekit.plugins import openai

from model import build_realtime_model, load_realtime_config


def _set_openai_and_livekit(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("LIVEKIT_API_KEY", "APItest")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "secret")


def test_default_providers_are_openai_then_inference(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("REALTIME_PROVIDERS", raising=False)
    monkeypatch.delenv("REALTIME_MODEL", raising=False)
    _set_openai_and_livekit(monkeypatch)
    model = build_realtime_model()
    assert isinstance(model, RealtimeModelFallbackAdapter)
    # Adapter has no public fallback list; `_models` is the only way to assert
    # provider order and each fallback model id.
    assert isinstance(model._models[0], openai.realtime.RealtimeModel)
    assert isinstance(model._models[1], inference.RealtimeModel)
    assert model._models[0].model == "gpt-realtime-2.1"
    assert model._models[1].model == "openai/gpt-realtime-2.1"


def test_single_openai_provider_returns_plugin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "openai")
    monkeypatch.setenv("REALTIME_MODEL", "gpt-realtime-2.1")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    model = build_realtime_model()
    assert isinstance(model, openai.realtime.RealtimeModel)
    assert model.model == "gpt-realtime-2.1"


def test_single_inference_provider_returns_inference_and_prefix(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "inference")
    monkeypatch.setenv("REALTIME_MODEL", "gpt-realtime-2.1")
    monkeypatch.setenv("LIVEKIT_API_KEY", "APItest")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "secret")
    model = build_realtime_model()
    assert isinstance(model, inference.RealtimeModel)
    assert model.model == "openai/gpt-realtime-2.1"


def test_inference_keeps_an_existing_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "inference")
    monkeypatch.setenv("REALTIME_MODEL", "openai/gpt-realtime-2.1")
    monkeypatch.setenv("LIVEKIT_API_KEY", "APItest")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "secret")
    model = build_realtime_model()
    assert isinstance(model, inference.RealtimeModel)
    assert model.model == "openai/gpt-realtime-2.1"


def test_two_providers_return_adapter_in_list_order(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "inference,openai")
    monkeypatch.setenv("REALTIME_MODEL", "gpt-realtime-2.1")
    _set_openai_and_livekit(monkeypatch)
    model = build_realtime_model()
    assert isinstance(model, RealtimeModelFallbackAdapter)
    # Adapter has no public fallback list; `_models` is the only way to assert
    # provider order and each fallback model id.
    assert isinstance(model._models[0], inference.RealtimeModel)
    assert isinstance(model._models[1], openai.realtime.RealtimeModel)
    assert model._models[0].model == "openai/gpt-realtime-2.1"
    assert model._models[1].model == "gpt-realtime-2.1"


def test_adapter_accepts_default_openai_and_inference_capabilities(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "openai,inference")
    _set_openai_and_livekit(monkeypatch)
    model = build_realtime_model()
    assert isinstance(model, RealtimeModelFallbackAdapter)
    # Adapter has no public fallback list; `_models` is the only way to assert
    # matching capabilities across each fallback model.
    hard = ("audio_output", "turn_detection", "supports_overlapping_speech")
    first = model._models[0].capabilities
    for other in model._models[1:]:
        for name in hard:
            assert getattr(other.capabilities, name) == getattr(first, name)


def test_unknown_provider_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "azure")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    with pytest.raises(ValueError, match="Unknown REALTIME_PROVIDERS"):
        build_realtime_model()


def test_empty_providers_raise(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "")
    with pytest.raises(ValueError, match="REALTIME_PROVIDERS is empty"):
        build_realtime_model()


def test_openai_missing_key_raises_at_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "openai,inference")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("LIVEKIT_API_KEY", "APItest")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "secret")
    with pytest.raises(ValueError, match="OPENAI_API_KEY"):
        build_realtime_model()


def test_empty_model_id_raises_at_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "inference")
    monkeypatch.setenv("REALTIME_MODEL", "  ")
    with pytest.raises(ValueError, match="REALTIME_MODEL is empty"):
        load_realtime_config()


def test_model_log_has_qualified_classes_and_fallback_ids(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    monkeypatch.setenv("REALTIME_PROVIDERS", "openai,inference")
    monkeypatch.setenv("REALTIME_MODEL", "gpt-realtime-2.1")
    _set_openai_and_livekit(monkeypatch)
    with caplog.at_level("INFO", logger="agent"):
        build_realtime_model()
    payload = next(
        json.loads(record.message)
        for record in caplog.records
        if record.message.startswith("{")
    )
    assert "RealtimeModelFallbackAdapter" in payload["class"]
    assert "livekit.plugins.openai" in payload["fallbacks"][0]["class"]
    assert payload["fallbacks"][0]["model_id"] == "gpt-realtime-2.1"
    assert payload["fallbacks"][1]["model_id"] == "openai/gpt-realtime-2.1"
