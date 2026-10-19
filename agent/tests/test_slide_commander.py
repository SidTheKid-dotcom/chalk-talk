from __future__ import annotations

import json
from typing import Any

import pytest
from livekit.rtc import RpcError

from slide_commander import (
    FAILED_HIGHLIGHT,
    FAILED_SLIDE,
    RPC_MAX_ROUND_TRIP_S,
    RPC_TIMEOUT_S,
    SlideCommander,
    reason_for_code,
)


class FakeRemote:
    def __init__(self, identity: str, attributes: dict[str, str]) -> None:
        self.identity = identity
        self.attributes = attributes


class FakeLocal:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self.attribute_calls: list[dict[str, str]] = []
        self._handler: Any = None
        self._error: BaseException | None = None
        self._attr_error: BaseException | None = None

    def set_handler(self, handler: Any) -> None:
        self._handler = handler

    def set_error(self, error: BaseException) -> None:
        self._error = error

    def set_attributes_error(self, error: BaseException) -> None:
        self._attr_error = error

    async def perform_rpc(
        self,
        *,
        destination_identity: str,
        method: str,
        payload: str,
        response_timeout: float | None = None,
        max_round_trip_latency: float | None = None,
    ) -> str:
        self.calls.append(
            {
                "destination_identity": destination_identity,
                "method": method,
                "payload": payload,
                "response_timeout": response_timeout,
                "max_round_trip_latency": max_round_trip_latency,
            }
        )
        if self._error is not None:
            raise self._error
        if self._handler is not None:
            return await self._handler(
                destination_identity, method, payload, response_timeout
            )
        body = json.loads(payload)
        if method == "show_slide":
            return json.dumps(
                {
                    "ok": True,
                    "slide_id": body["slide_id"],
                    "seq": body["seq"],
                    "applied": True,
                }
            )
        return json.dumps(
            {
                "ok": True,
                "seq": body["seq"],
                "applied": True,
                "target": body.get("target"),
                "active": [body.get("target")],
            }
        )

    async def set_attributes(self, attributes: dict[str, str]) -> None:
        if self._attr_error is not None:
            raise self._attr_error
        self.attribute_calls.append(dict(attributes))


class FakeRoom:
    def __init__(self, participants: list[FakeRemote]) -> None:
        self.remote_participants = {item.identity: item for item in participants}
        self.local_participant = FakeLocal()


def _room_with_coach_first() -> FakeRoom:
    return FakeRoom(
        [
            FakeRemote("coach-aaa", {"role": "coach"}),
            FakeRemote("player-bbb", {"role": "player"}),
        ]
    )


@pytest.mark.asyncio
async def test_find_player_by_role_when_coach_joined_first() -> None:
    room = _room_with_coach_first()
    commander = SlideCommander(room)
    player = commander.find_player()
    assert player is not None
    assert player.identity == "player-bbb"
    first = next(iter(room.remote_participants.values()))
    assert first.identity == "coach-aaa"


@pytest.mark.asyncio
async def test_show_slide_ack_writes_attributes_after_applied() -> None:
    room = _room_with_coach_first()
    commander = SlideCommander(room)
    result = await commander.show_slide("s2_lebron")
    assert "How do we stop LeBron?" in result
    assert room.local_participant.calls[0]["destination_identity"] == "player-bbb"
    assert room.local_participant.calls[0]["response_timeout"] == RPC_TIMEOUT_S
    assert room.local_participant.calls[0]["max_round_trip_latency"] == RPC_MAX_ROUND_TRIP_S
    assert len(room.local_participant.attribute_calls) == 1
    attrs = room.local_participant.attribute_calls[0]
    assert attrs["current_slide"] == "s2_lebron"
    assert attrs["slide_seq"] == "1"
    overlay = json.loads(attrs["overlay_state"])
    assert overlay["highlights"] == []
    assert overlay["play"] is None
    assert overlay["slide_id"] == "s2_lebron"
    assert overlay["seq"] == 1


@pytest.mark.asyncio
async def test_stale_ack_does_not_write_attributes() -> None:
    room = _room_with_coach_first()

    async def stale_then_applied(
        _identity: str, method: str, payload: str, _timeout: float | None
    ) -> str:
        body = json.loads(payload)
        if body["seq"] == 1:
            return json.dumps(
                {
                    "ok": True,
                    "slide_id": body["slide_id"],
                    "seq": body["seq"],
                    "applied": False,
                    "reason": "stale",
                }
            )
        return json.dumps(
            {
                "ok": True,
                "slide_id": body["slide_id"],
                "seq": body["seq"],
                "applied": True,
            }
        )

    room.local_participant.set_handler(stale_then_applied)
    commander = SlideCommander(room)
    first = await commander.show_slide("s1_tipoff")
    assert first == FAILED_SLIDE.format(reason="stale")
    assert room.local_participant.attribute_calls == []
    second = await commander.show_slide("s3_kyrie")
    assert "Kyrie" in second
    assert room.local_participant.attribute_calls[0]["current_slide"] == "s3_kyrie"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("code", "kind"),
    [
        (2001, "slide"),
        (2002, "slide"),
        (2003, "slide"),
        (1400, "slide"),
        (1401, "slide"),
        (1402, "slide"),
        (1403, "slide"),
        (1404, "slide"),
        (1500, "slide"),
        (1501, "slide"),
        (1502, "slide"),
        (1503, "slide"),
        (1504, "slide"),
        (1505, "slide"),
        (2004, "highlight"),
        (2007, "highlight"),
    ],
)
async def test_rpc_error_maps_to_failure_string(code: int, kind: str) -> None:
    room = _room_with_coach_first()
    room.local_participant.set_error(RpcError(code, reason_for_code(code)))
    commander = SlideCommander(room)
    if kind == "highlight":
        commander._current_slide = "s2_lebron"
        result = await commander.highlight("cle_james")
        assert result == FAILED_HIGHLIGHT.format(reason=reason_for_code(code))
    else:
        result = await commander.show_slide("s1_tipoff")
        assert result == FAILED_SLIDE.format(reason=reason_for_code(code))
    assert room.local_participant.attribute_calls == []


@pytest.mark.asyncio
async def test_timeout_failure_string() -> None:
    room = _room_with_coach_first()
    room.local_participant.set_error(RpcError(1502, "Response timeout"))
    commander = SlideCommander(room)
    result = await commander.show_slide("s4_offense")
    assert result == FAILED_SLIDE.format(reason="response timeout")
    assert room.local_participant.attribute_calls == []


@pytest.mark.asyncio
async def test_missing_player_returns_failure_without_rpc() -> None:
    room = FakeRoom([FakeRemote("coach-aaa", {"role": "coach"})])
    commander = SlideCommander(room)
    result = await commander.show_slide("s1_tipoff")
    assert result == FAILED_SLIDE.format(reason="player not found")
    assert room.local_participant.calls == []
    assert room.local_participant.attribute_calls == []


@pytest.mark.asyncio
async def test_attributes_only_after_ack() -> None:
    room = _room_with_coach_first()
    room.local_participant.set_error(RpcError(1503, "Recipient disconnected"))
    commander = SlideCommander(room)
    await commander.show_slide("s1_tipoff")
    assert commander.attribute_writes == []
    assert room.local_participant.attribute_calls == []


@pytest.mark.asyncio
async def test_highlight_off_slide_does_not_send_rpc() -> None:
    room = _room_with_coach_first()
    commander = SlideCommander(room)
    await commander.show_slide("s1_tipoff")
    rpc_count = len(room.local_participant.calls)
    result = await commander.highlight("cle_james")
    assert result.startswith("FAILED: cle_james is not on this slide")
    assert len(room.local_participant.calls) == rpc_count


@pytest.mark.asyncio
async def test_highlight_ack_updates_overlay_only() -> None:
    room = _room_with_coach_first()
    commander = SlideCommander(room)
    await commander.show_slide("s2_lebron")
    result = await commander.highlight("cle_james")
    assert "Highlighted James" in result
    last = room.local_participant.attribute_calls[-1]
    assert "current_slide" not in last
    overlay = json.loads(last["overlay_state"])
    assert overlay["highlights"] == ["cle_james"]
    assert overlay["slide_id"] == "s2_lebron"


@pytest.mark.asyncio
async def test_stale_highlight_ack_is_failure_not_success() -> None:
    room = _room_with_coach_first()

    async def stale_highlight(
        _identity: str, method: str, payload: str, _timeout: float | None
    ) -> str:
        body = json.loads(payload)
        if method == "highlight":
            return json.dumps(
                {
                    "ok": True,
                    "seq": body["seq"],
                    "applied": False,
                    "reason": "stale",
                    "target": body.get("target"),
                    "active": [],
                }
            )
        return json.dumps(
            {
                "ok": True,
                "slide_id": body["slide_id"],
                "seq": body["seq"],
                "applied": True,
            }
        )

    room.local_participant.set_handler(stale_highlight)
    commander = SlideCommander(room)
    await commander.show_slide("s2_lebron")
    writes_after_slide = list(room.local_participant.attribute_calls)
    result = await commander.highlight("cle_james")
    assert result == FAILED_HIGHLIGHT.format(reason="stale")
    assert room.local_participant.attribute_calls == writes_after_slide
    assert "Highlighted" not in result


@pytest.mark.asyncio
async def test_set_attributes_failure_still_returns_narration() -> None:
    room = _room_with_coach_first()
    room.local_participant.set_attributes_error(RuntimeError("coach mirror down"))
    commander = SlideCommander(room)
    result = await commander.show_slide("s2_lebron")
    assert "How do we stop LeBron?" in result
    assert not result.startswith("FAILED:")
    assert room.local_participant.attribute_calls == []
    assert commander.attribute_writes == []
    assert commander.current_slide == "s2_lebron"
    highlight = await commander.highlight("cle_james")
    assert "Highlighted James" in highlight
