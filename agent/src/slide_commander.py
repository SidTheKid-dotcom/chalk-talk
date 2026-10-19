from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import Mapping
from typing import Any, Protocol

from livekit.rtc import RpcError

from callout import callout_rule_reason, rejected_callout
from deck_data import (
    SLIDE_IDS,
    empty_overlay,
    get_play,
    get_slide,
    load_deck,
    play_narration,
    slide_narration,
    target_label,
    targets_on_slide,
)

logger = logging.getLogger("agent")

RPC_TIMEOUT_S = 3.0
RPC_MAX_ROUND_TRIP_S = 2.0

FAILED_SLIDE = "FAILED: slide not shown ({reason}). Do not describe it as on screen."
FAILED_HIGHLIGHT = (
    "FAILED: highlight not shown ({reason}). Do not say it is highlighted."
)
FAILED_PLAY = "FAILED: play not shown ({reason}). Do not describe it as on screen."
FAILED_CALLOUT = "FAILED: callout not shown ({reason})."

_RPC_REASONS: dict[int, str] = {
    1400: "unsupported method",
    1401: "recipient not found",
    1402: "request payload too large",
    1403: "unsupported server",
    1404: "unsupported version",
    1500: "application error",
    1501: "connection timeout",
    1502: "response timeout",
    1503: "recipient disconnected",
    1504: "response payload too large",
    1505: "send failed",
    2001: "unknown slide_id",
    2002: "malformed payload",
    2003: "not ready",
    2004: "unknown target, or target not on this slide",
    2005: "callout rejected",
    2006: "unknown play_id",
    2007: "slide mismatch",
}


class LocalParticipantLike(Protocol):
    async def perform_rpc(
        self,
        *,
        destination_identity: str,
        method: str,
        payload: str,
        response_timeout: float | None = None,
        max_round_trip_latency: float | None = None,
    ) -> str: ...

    async def set_attributes(self, attributes: dict[str, str]) -> None: ...


class RemoteParticipantLike(Protocol):
    identity: str
    attributes: Mapping[str, str]


class RoomLike(Protocol):
    remote_participants: Mapping[str, RemoteParticipantLike]
    local_participant: LocalParticipantLike


def reason_for_code(code: int, fallback: str | None = None) -> str:
    if code in _RPC_REASONS:
        return _RPC_REASONS[code]
    if fallback:
        return fallback
    return f"rpc error {code}"


class SlideCommander:
    """Owns seq, finds the player by role, and gates attributes on applied acks."""

    def __init__(self, room: RoomLike, deck: dict[str, Any] | None = None) -> None:
        self._room = room
        self._deck = deck if deck is not None else load_deck()
        self._lock = asyncio.Lock()
        self._seq = 0
        self._current_slide: str | None = None
        self._overlay: dict[str, Any] | None = None
        self._player_identity: str | None = None
        self._attribute_writes: list[dict[str, str]] = []
        self.round_trips_ms: list[float] = []

    @property
    def seq(self) -> int:
        return self._seq

    @property
    def current_slide(self) -> str | None:
        return self._current_slide

    @property
    def overlay(self) -> dict[str, Any] | None:
        return self._overlay

    @property
    def attribute_writes(self) -> list[dict[str, str]]:
        return list(self._attribute_writes)

    def find_player(self) -> RemoteParticipantLike | None:
        found: RemoteParticipantLike | None = None
        for participant in self._room.remote_participants.values():
            if participant.attributes.get("role") == "player":
                if found is not None:
                    logger.warning(
                        json.dumps(
                            {
                                "event": "multiple_players",
                                "kept": found.identity,
                                "ignored": participant.identity,
                            }
                        )
                    )
                    continue
                found = participant
        if found is not None:
            self._player_identity = found.identity
        return found

    def role_of(self, identity: str) -> str | None:
        participant = self._room.remote_participants.get(identity)
        if participant is None:
            for item in self._room.remote_participants.values():
                if item.identity == identity:
                    return item.attributes.get("role")
            return None
        return participant.attributes.get("role")

    async def show_slide(self, slide_id: str) -> str:
        async with self._lock:
            return await self._show_slide_locked(slide_id)

    async def highlight(self, target: str) -> str:
        async with self._lock:
            return await self._highlight_locked(target)

    async def run_play(self, play_id: str) -> str:
        async with self._lock:
            return await self._run_play_locked(play_id)

    async def add_callout(
        self, fact_id: str | None = None, text: str | None = None
    ) -> str:
        async with self._lock:
            return await self._add_callout_locked(fact_id, text)

    async def _show_slide_locked(self, slide_id: str) -> str:
        if slide_id not in SLIDE_IDS or get_slide(slide_id, self._deck) is None:
            return FAILED_SLIDE.format(reason=f"unknown slide_id {slide_id}")
        self._seq += 1
        payload = {"slide_id": slide_id, "seq": self._seq}
        result = await self._rpc("show_slide", payload, kind="slide")
        applied, failure = _applied_or_failure(result, FAILED_SLIDE)
        if not applied:
            return failure or result
        return slide_narration(slide_id, self._deck)

    async def _highlight_locked(self, target: str) -> str:
        if self._current_slide is None:
            return FAILED_HIGHLIGHT.format(
                reason="no slide on screen. Call show_slide first"
            )
        slide = get_slide(self._current_slide, self._deck)
        allowed = targets_on_slide(slide) if slide else []
        if target not in allowed:
            listed = ",".join(allowed) if allowed else "(none)"
            return (
                f"FAILED: {target} is not on this slide. Targets here: {listed}. "
                "Call show_slide first if needed."
            )
        self._seq += 1
        payload = {
            "slide_id": self._current_slide,
            "seq": self._seq,
            "target": target,
        }
        result = await self._rpc("highlight", payload, kind="highlight")
        applied, failure = _applied_or_failure(result, FAILED_HIGHLIGHT)
        if not applied:
            return failure or result
        label = target_label(target, self._deck)
        return f"Highlighted {label}. Refer to it as highlighted."

    async def _run_play_locked(self, play_id: str) -> str:
        play = get_play(play_id, self._deck)
        if play is None:
            return FAILED_PLAY.format(reason=f"unknown play_id {play_id}")
        play_slide = str(play["slide_id"])
        if self._current_slide != play_slide:
            slide_result = await self._show_slide_locked(play_slide)
            if slide_result.startswith("FAILED:"):
                return slide_result
        self._seq += 1
        payload = {
            "slide_id": play_slide,
            "seq": self._seq,
            "play_id": play_id,
        }
        result = await self._rpc("run_play", payload, kind="play")
        applied, failure = _applied_or_failure(result, FAILED_PLAY)
        if not applied:
            return failure or result
        return play_narration(play)

    async def _add_callout_locked(self, fact_id: str | None, text: str | None) -> str:
        if self._current_slide is None:
            return FAILED_CALLOUT.format(
                reason="no slide on screen. Call show_slide first"
            )
        fact = fact_id.strip() if isinstance(fact_id, str) else None
        note = text.strip() if isinstance(text, str) else None
        if fact == "":
            fact = None
        if note == "":
            note = None
        rule = callout_rule_reason(fact, note)
        if rule is not None:
            return rejected_callout(rule)
        self._seq += 1
        payload: dict[str, Any] = {
            "slide_id": self._current_slide,
            "seq": self._seq,
            "callout_id": f"c{self._seq}",
        }
        if fact:
            payload["fact_id"] = fact
        else:
            payload["text"] = note
        result = await self._rpc("add_callout", payload, kind="callout")
        applied, failure = _applied_or_failure(result, FAILED_CALLOUT)
        if not applied:
            return failure or result
        return "Callout is on both screens."

    async def _rpc(self, method: str, payload: dict[str, Any], *, kind: str) -> str:
        fail = _fail_template(kind)
        player = self.find_player()
        if player is None:
            self._log_roundtrip(
                method=method,
                payload=payload,
                ok=False,
                applied=False,
                round_trip_ms=0,
                code=1401,
                reason="player not found",
                failure=fail.format(reason="player not found"),
            )
            return fail.format(reason="player not found")

        started = time.perf_counter()
        try:
            raw = await self._room.local_participant.perform_rpc(
                destination_identity=player.identity,
                method=method,
                payload=json.dumps(payload),
                response_timeout=RPC_TIMEOUT_S,
                max_round_trip_latency=RPC_MAX_ROUND_TRIP_S,
            )
        except RpcError as exc:
            elapsed_ms = (time.perf_counter() - started) * 1000
            reason = reason_for_code(exc.code, exc.message)
            failure = fail.format(reason=reason)
            self._log_roundtrip(
                method=method,
                payload=payload,
                ok=False,
                applied=False,
                round_trip_ms=elapsed_ms,
                code=exc.code,
                reason=reason,
                failure=failure,
            )
            return failure
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - started) * 1000
            reason = f"application error ({type(exc).__name__})"
            failure = fail.format(reason=reason)
            self._log_roundtrip(
                method=method,
                payload=payload,
                ok=False,
                applied=False,
                round_trip_ms=elapsed_ms,
                code=1500,
                reason=reason,
                failure=failure,
            )
            return failure

        elapsed_ms = (time.perf_counter() - started) * 1000
        try:
            ack = json.loads(raw)
        except json.JSONDecodeError:
            failure = fail.format(reason="malformed ack")
            self._log_roundtrip(
                method=method,
                payload=payload,
                ok=False,
                applied=False,
                round_trip_ms=elapsed_ms,
                code=2002,
                reason="malformed ack",
                failure=failure,
            )
            return failure

        applied = bool(ack.get("applied"))
        seq = int(payload["seq"])
        self._log_roundtrip(
            method=method,
            payload=payload,
            ok=True,
            applied=applied,
            round_trip_ms=elapsed_ms,
            ack=ack,
        )
        if applied:
            await self._write_attributes_after_ack(method, payload, ack, seq)
        return raw

    async def _write_attributes_after_ack(
        self,
        method: str,
        payload: dict[str, Any],
        ack: dict[str, Any],
        seq: int,
    ) -> None:
        if method == "show_slide":
            slide_id = str(payload["slide_id"])
            overlay = empty_overlay(slide_id, seq)
            attrs = {
                "current_slide": slide_id,
                "slide_seq": str(seq),
                "overlay_state": json.dumps(overlay, separators=(",", ":")),
            }
            await self._set_attributes(attrs, method=method, seq=seq)
            self._current_slide = slide_id
            self._overlay = overlay
            return

        if method == "highlight":
            slide_id = self._current_slide or str(payload.get("slide_id") or "")
            highlights = ack.get("active")
            if not isinstance(highlights, list):
                highlights = [payload["target"]]
            overlay = {
                "v": 1,
                "slide_id": slide_id,
                "seq": seq,
                "highlights": [str(item) for item in highlights][:2],
                "play": (self._overlay or {}).get("play"),
                "callouts": (self._overlay or {}).get("callouts") or [],
            }
            await self._write_overlay(overlay, method=method, seq=seq)
            return

        if method == "run_play":
            slide_id = self._current_slide or str(payload.get("slide_id") or "")
            overlay = {
                "v": 1,
                "slide_id": slide_id,
                "seq": seq,
                "highlights": (self._overlay or {}).get("highlights") or [],
                "play": {"play_id": str(payload["play_id"]), "seq": seq},
                "callouts": (self._overlay or {}).get("callouts") or [],
            }
            await self._write_overlay(overlay, method=method, seq=seq)
            return

        if method == "add_callout":
            slide_id = self._current_slide or str(payload.get("slide_id") or "")
            incoming: dict[str, Any] = {"callout_id": str(payload["callout_id"])}
            if payload.get("fact_id"):
                incoming["fact_id"] = str(payload["fact_id"])
            if payload.get("text") is not None:
                incoming["text"] = str(payload["text"])
            previous = (self._overlay or {}).get("callouts") or []
            by_id = {
                str(item.get("callout_id")): item
                for item in previous
                if isinstance(item, dict)
            }
            by_id[incoming["callout_id"]] = incoming
            active = ack.get("active")
            if isinstance(active, list) and active:
                callouts = [by_id[str(item)] for item in active if str(item) in by_id][
                    :3
                ]
            else:
                kept = [
                    item
                    for item in previous
                    if item.get("callout_id") != incoming["callout_id"]
                ]
                callouts = [*kept, incoming][-3:]
            overlay = {
                "v": 1,
                "slide_id": slide_id,
                "seq": seq,
                "highlights": (self._overlay or {}).get("highlights") or [],
                "play": (self._overlay or {}).get("play"),
                "callouts": callouts,
            }
            await self._write_overlay(overlay, method=method, seq=seq)

    async def _write_overlay(
        self, overlay: dict[str, Any], *, method: str, seq: int
    ) -> None:
        attrs = {"overlay_state": json.dumps(overlay, separators=(",", ":"))}
        await self._set_attributes(attrs, method=method, seq=seq)
        self._overlay = overlay

    async def _set_attributes(
        self, attrs: dict[str, str], *, method: str, seq: int
    ) -> None:
        try:
            await self._room.local_participant.set_attributes(attrs)
        except Exception as exc:
            logger.error(
                json.dumps(
                    {
                        "event": "set_attributes_failed",
                        "method": method,
                        "seq": seq,
                        "error_type": type(exc).__name__,
                        "error": str(exc),
                    }
                )
            )
            return
        self._attribute_writes.append(attrs)

    def _log_roundtrip(
        self,
        *,
        method: str,
        payload: dict[str, Any],
        ok: bool,
        applied: bool,
        round_trip_ms: float,
        code: int | None = None,
        reason: str | None = None,
        failure: str | None = None,
        ack: dict[str, Any] | None = None,
    ) -> None:
        line: dict[str, Any] = {
            "event": "rpc_roundtrip",
            "method": method,
            "seq": payload.get("seq"),
            "slide_id": payload.get("slide_id"),
            "ok": ok,
            "applied": applied,
            "round_trip_ms": round(round_trip_ms, 1),
        }
        if payload.get("target") is not None:
            line["target"] = payload["target"]
        if payload.get("play_id") is not None:
            line["play_id"] = payload["play_id"]
        if payload.get("callout_id") is not None:
            line["callout_id"] = payload["callout_id"]
        if code is not None:
            line["code"] = code
        if reason is not None:
            line["reason"] = reason
        if failure is not None:
            line["failure"] = failure
        if ack is not None:
            line["ack"] = ack
        if ok and applied:
            self.round_trips_ms.append(round(round_trip_ms, 1))
        logger.info(json.dumps(line))


def _fail_template(kind: str) -> str:
    if kind == "highlight":
        return FAILED_HIGHLIGHT
    if kind == "play":
        return FAILED_PLAY
    if kind == "callout":
        return FAILED_CALLOUT
    return FAILED_SLIDE


def _applied_or_failure(result: str, fail: str) -> tuple[bool, str | None]:
    if result.startswith("FAILED:"):
        return False, result
    try:
        ack = json.loads(result)
    except json.JSONDecodeError:
        return False, result
    if ack.get("applied"):
        return True, None
    reason = ack.get("reason", "not applied")
    return False, fail.format(reason=reason)
