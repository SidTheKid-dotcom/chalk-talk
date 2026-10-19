from __future__ import annotations

import json

import pytest
from livekit.rtc import RpcInvocationData
from test_slide_commander import FakeRemote, FakeRoom, _room_with_coach_first

from debug_probe import DebugSlideCommander, handle_debug_probe
from slide_commander import SlideCommander


def _invocation(identity: str, payload: dict[str, object] | None = None) -> RpcInvocationData:
    return RpcInvocationData(
        request_id="req-1",
        caller_identity=identity,
        payload=json.dumps(payload or {"action": "show_slide", "slide_id": "s1_tipoff"}),
        response_timeout=3.0,
        method="debug_probe",
    )


def test_production_commander_has_no_debug_helpers() -> None:
    commander = SlideCommander(_room_with_coach_first())
    assert not hasattr(commander, "arm_dead_tab")
    assert not hasattr(commander, "send_raw")
    assert not hasattr(commander, "on_participant_disconnected")


@pytest.mark.asyncio
async def test_debug_probe_rejects_non_player_role(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CHALK_DEBUG", "1")
    room = _room_with_coach_first()
    commander = DebugSlideCommander(room)
    result = json.loads(
        await handle_debug_probe(commander, _invocation("coach-aaa"))
    )
    assert result["ok"] is False
    assert result["error"] == "player role required"
    assert room.local_participant.calls == []


@pytest.mark.asyncio
async def test_debug_probe_rejects_unknown_caller(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CHALK_DEBUG", "1")
    room = FakeRoom([FakeRemote("player-bbb", {"role": "player"})])
    commander = DebugSlideCommander(room)
    result = json.loads(
        await handle_debug_probe(commander, _invocation("spectator"))
    )
    assert result["ok"] is False
    assert result["error"] == "player role required"


@pytest.mark.asyncio
async def test_debug_probe_player_can_show_slide(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CHALK_DEBUG", "1")
    room = _room_with_coach_first()
    commander = DebugSlideCommander(room)
    raw = await handle_debug_probe(
        commander,
        _invocation("player-bbb", {"action": "show_slide", "slide_id": "s2_lebron"}),
    )
    result = json.loads(raw)
    assert result["ok"] is True
    assert "How do we stop LeBron?" in result["result"]
