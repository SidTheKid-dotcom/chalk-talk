from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.parse import quote, urlparse

from livekit.agents.llm import ChatMessage
from livekit.agents.voice.room_io.types import DEFAULT_CLOSE_ON_DISCONNECT_REASONS
from livekit.rtc import RpcError

logger = logging.getLogger("agent")

COACH_BRIEFING_TOPIC = "coach-briefing"
COACH_LINK_RESULT = "Coach link is on screen. Say one short line, then wait."
COACH_LINK_FAILED = "FAILED: coach link not shown ({reason})."
COACH_LINK_RPC_TIMEOUT_S = 3.0
COACH_LINK_MAX_ROUND_TRIP_S = 2.0
FLOOR_DEBOUNCE_S = 0.2
TRUSTED_HUMAN_ROLES = frozenset({"player", "coach"})

_RPC_REASONS = {
    1400: "unsupported method",
    1401: "recipient not found",
    1500: "application error",
    1501: "connection timeout",
    1502: "response timeout",
    1503: "recipient disconnected",
    1505: "send failed",
}


class RemoteParticipantLike(Protocol):
    identity: str
    attributes: Mapping[str, str]


class LocalParticipantLike(Protocol):
    identity: str

    async def perform_rpc(
        self,
        *,
        destination_identity: str,
        method: str,
        payload: str,
        response_timeout: float | None = None,
        max_round_trip_latency: float | None = None,
    ) -> str: ...

    async def send_text(
        self,
        text: str,
        *,
        destination_identities: list[str] | None = None,
        topic: str = "",
    ) -> Any: ...

    async def set_attributes(self, attributes: dict[str, str]) -> None: ...


class RoomLike(Protocol):
    name: str
    remote_participants: Mapping[str, RemoteParticipantLike]
    local_participant: LocalParticipantLike

    def on(self, event: str, callback: Any) -> Any: ...

    def off(self, event: str, callback: Any) -> Any: ...


class RoomIOLike(Protocol):
    linked_participant: RemoteParticipantLike | None

    def set_participant(self, participant_identity: str | None) -> None: ...


class SpeechHandleLike(Protocol):
    def __await__(self) -> Any: ...

    def exception(self) -> BaseException | None: ...


class SessionLike(Protocol):
    room_io: RoomIOLike
    current_agent: Any

    def generate_reply(self, **kwargs: Any) -> SpeechHandleLike: ...

    def shutdown(self, *, drain: bool = True) -> None: ...


class AgentLike(Protocol):
    async def update_instructions(self, instructions: str) -> None: ...


class SlideStateLike(Protocol):
    @property
    def current_slide(self) -> str | None: ...


def _log(event: str, **fields: object) -> None:
    logger.info(json.dumps({"event": event, **fields}))


def _log_unhandled_task_error(done: asyncio.Task[None], name: str) -> None:
    if done.cancelled():
        return
    exc = done.exception()
    if exc is None:
        return
    logger.error(
        json.dumps(
            {
                "event": "async_task_failed",
                "task": name,
                "error": f"{type(exc).__name__}: {exc}",
            }
        ),
        exc_info=exc,
    )


def participant_role(participant: object) -> str | None:
    attributes = getattr(participant, "attributes", None) or {}
    role = attributes.get("role")
    return role if isinstance(role, str) else None


def find_by_role(room: RoomLike, role: str) -> RemoteParticipantLike | None:
    found: RemoteParticipantLike | None = None
    for participant in room.remote_participants.values():
        if participant_role(participant) != role:
            continue
        if found is not None:
            logger.warning(
                json.dumps(
                    {
                        "event": "multiple_role",
                        "role": role,
                        "kept": found.identity,
                        "ignored": participant.identity,
                    }
                )
            )
            continue
        found = participant
    return found


def validate_app_url(app_url: str) -> str:
    parsed = urlparse(app_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("NEXT_PUBLIC_APP_URL must be an absolute http(s) URL")
    return app_url.rstrip("/")


def _user_turn_texts(source: object) -> list[str]:
    chat = getattr(source, "chat_ctx", None)
    if chat is None:
        chat = getattr(getattr(source, "current_agent", None), "chat_ctx", None)
    items = getattr(chat, "items", []) or []
    turns: list[str] = []
    for item in items:
        if not isinstance(item, ChatMessage) or item.role != "user":
            continue
        text = item.text_content
        if not text or not text.strip():
            continue
        turns.append(text.strip())
    return turns


@dataclass
class HandoffState:
    handoff_requested: bool = False
    request_count: int = 0
    active_coach_identity: str | None = None
    user_turn_count: int | None = None

    def mark_requested(self, turn_source: object) -> None:
        self.handoff_requested = True
        self.request_count += 1
        # Includes the request turn. The briefing reads only the turns before it.
        self.user_turn_count = len(_user_turn_texts(turn_source))


class CoachLinkCommander:
    """Own the acked agent-to-player coach-link command."""

    def __init__(self, room: RoomLike, app_url: str, state: HandoffState) -> None:
        self._room = room
        self._app_url = validate_app_url(app_url)
        self._state = state

    @property
    def coach_url(self) -> str:
        room_name = quote(self._room.name, safe="")
        return f"{self._app_url}/coach?room={room_name}"

    async def request_handoff(self, turn_source: object) -> str:
        player = find_by_role(self._room, "player")
        if player is None:
            return COACH_LINK_FAILED.format(reason="player not found")

        started = time.perf_counter()
        payload = json.dumps({"url": self.coach_url})
        try:
            raw = await self._room.local_participant.perform_rpc(
                destination_identity=player.identity,
                method="show_coach_link",
                payload=payload,
                response_timeout=COACH_LINK_RPC_TIMEOUT_S,
                max_round_trip_latency=COACH_LINK_MAX_ROUND_TRIP_S,
            )
        except RpcError as exc:
            reason = _RPC_REASONS.get(exc.code, exc.message or f"rpc error {exc.code}")
            self._log_result(started, player.identity, False, reason, exc.code)
            return COACH_LINK_FAILED.format(reason=reason)
        except Exception as exc:
            reason = f"application error ({type(exc).__name__})"
            self._log_result(started, player.identity, False, reason, 1500)
            return COACH_LINK_FAILED.format(reason=reason)

        try:
            ack = json.loads(raw)
        except json.JSONDecodeError:
            self._log_result(started, player.identity, False, "malformed ack", 2002)
            return COACH_LINK_FAILED.format(reason="malformed ack")
        if not isinstance(ack, dict):
            self._log_result(started, player.identity, False, "malformed ack", 2002)
            return COACH_LINK_FAILED.format(reason="malformed ack")
        if ack.get("ok") is not True:
            reason = str(ack.get("reason") or "not acknowledged")
            self._log_result(started, player.identity, False, reason, None)
            return COACH_LINK_FAILED.format(reason=reason)

        self._state.mark_requested(turn_source)
        self._log_result(started, player.identity, True, None, None)
        _log(
            "handoff_requested",
            player_identity=player.identity,
            request_count=self._state.request_count,
        )
        return COACH_LINK_RESULT

    def _log_result(
        self,
        started: float,
        player_identity: str,
        ok: bool,
        reason: str | None,
        code: int | None,
    ) -> None:
        fields: dict[str, object] = {
            "player_identity": player_identity,
            "ok": ok,
            "round_trip_ms": round((time.perf_counter() - started) * 1000, 1),
        }
        if reason is not None:
            fields["reason"] = reason
        if code is not None:
            fields["code"] = code
        _log("coach_link_rpc", **fields)


def build_coach_briefing(
    session: SessionLike,
    current_slide: str | None,
    *,
    user_turn_count: int | None,
) -> dict[str, object]:
    user_turns = _user_turn_texts(session)
    if user_turn_count is None:
        relevant = user_turns
    else:
        # The recorded count includes the request turn. Later turns stay out.
        relevant = user_turns[: max(user_turn_count - 1, 0)]
    asked = relevant[-3:]
    main_worry = asked[-1] if asked else "No specific concern was captured."
    slide = current_slide or "unknown"
    summary = f"Main concern: {main_worry} Current slide: {slide}."
    return {
        "asked": asked,
        "main_worry": main_worry,
        "current_slide": slide,
        "summary": summary,
    }


def handoff_line_instructions(briefing: Mapping[str, object]) -> str:
    main_worry = str(briefing["main_worry"]).replace("\n", " ").strip()[:120]
    current_slide = str(briefing["current_slide"])
    return (
        "Give one short audible handoff line to the coach and nothing else. "
        f"Say that the player's main concern is {main_worry!r} and that the current "
        f"slide is {current_slide}. Do not call a tool."
    )


class ActiveSpeakerFloorRouter:
    """Debounce trusted human floor changes while keeping an active current floor."""

    def __init__(
        self,
        session: SessionLike,
        room: RoomLike,
        lock: asyncio.Lock,
        *,
        debounce_s: float = FLOOR_DEBOUNCE_S,
    ) -> None:
        self._session = session
        self._room = room
        self._lock = lock
        self._debounce_s = debounce_s
        self._enabled = False
        self._latest_active: tuple[str, ...] = ()
        self._pending_identity: str | None = None
        self._pending: asyncio.Task[None] | None = None

    def enable(self) -> None:
        self._enabled = True

    def disable(self) -> None:
        self._enabled = False
        self._latest_active = ()
        self._cancel_pending()

    def on_active_speakers_changed(self, speakers: list[object]) -> None:
        if not self._enabled:
            return
        trusted = [
            speaker
            for speaker in speakers
            if participant_role(speaker) in TRUSTED_HUMAN_ROLES
            and getattr(speaker, "identity", None)
            != getattr(self._room.local_participant, "identity", None)
        ]
        self._latest_active = tuple(str(speaker.identity) for speaker in trusted)
        current = self._linked_identity()
        if current in self._latest_active:
            self._cancel_pending()
            _log(
                "floor_held",
                identity=current,
                role=self._role_for_identity(current),
                active=list(self._latest_active),
            )
            return
        if not trusted:
            self._cancel_pending()
            return

        candidate = trusted[0]
        if candidate.identity == current:
            self._cancel_pending()
            return
        if self._pending_identity == candidate.identity and self._pending is not None:
            return

        self._cancel_pending()
        self._pending_identity = candidate.identity
        observed_at = time.perf_counter()
        pending = asyncio.create_task(
            self._switch_after_debounce(candidate.identity, observed_at),
            name="active_speaker_floor_switch",
        )
        pending.add_done_callback(
            lambda done: _log_unhandled_task_error(done, "active_speaker_floor_switch")
        )
        self._pending = pending

    async def drain(self) -> None:
        task = self._pending
        if task is not None:
            with contextlib.suppress(asyncio.CancelledError):
                await task

    async def _switch_after_debounce(self, identity: str, observed_at: float) -> None:
        try:
            await asyncio.sleep(self._debounce_s)
            async with self._lock:
                if not self._enabled or identity not in self._latest_active:
                    return
                current = self._linked_identity()
                if current in self._latest_active:
                    return
                participant = _participant_by_identity(self._room, identity)
                role = (
                    participant_role(participant) if participant is not None else None
                )
                if role not in TRUSTED_HUMAN_ROLES:
                    _log(
                        "floor_switch_rejected",
                        identity=identity,
                        role=role,
                        reason="untrusted_or_missing",
                    )
                    return
                started = time.perf_counter()
                try:
                    self._session.room_io.set_participant(identity)
                except Exception as exc:
                    logger.error(
                        json.dumps(
                            {
                                "event": "floor_switch_failed",
                                "old_identity": current,
                                "new_identity": identity,
                                "new_role": role,
                                "error_type": type(exc).__name__,
                                "error": str(exc),
                            }
                        )
                    )
                    return
                _log(
                    "floor_switched",
                    old_identity=current,
                    old_role=self._role_for_identity(current),
                    new_identity=identity,
                    new_role=role,
                    set_participant_ms=round((time.perf_counter() - started) * 1000, 2),
                    switch_latency_ms=round(
                        (time.perf_counter() - observed_at) * 1000, 2
                    ),
                )
        finally:
            if self._pending_identity == identity:
                self._pending_identity = None
                self._pending = None

    def _cancel_pending(self) -> None:
        if self._pending is not None and not self._pending.done():
            self._pending.cancel()
        self._pending = None
        self._pending_identity = None

    def _linked_identity(self) -> str | None:
        linked = self._session.room_io.linked_participant
        return linked.identity if linked is not None else None

    def _role_for_identity(self, identity: str | None) -> str | None:
        if identity is None:
            return None
        participant = _participant_by_identity(self._room, identity)
        return participant_role(participant) if participant is not None else None


class CoachSwitcher:
    """Own the coach handoff, floor routing, rollback, and leave recovery."""

    def __init__(
        self,
        session: SessionLike,
        agent: AgentLike,
        room: RoomLike,
        slide_state: SlideStateLike,
        state: HandoffState,
        *,
        presenter_instructions: str,
        clicker_instructions: str,
        floor_debounce_s: float = FLOOR_DEBOUNCE_S,
    ) -> None:
        self._session = session
        self._agent = agent
        self._room = room
        self._slide_state = slide_state
        self._state = state
        self._presenter_instructions = presenter_instructions
        self._clicker_instructions = clicker_instructions
        self._tasks: set[asyncio.Task[None]] = set()
        self._lock = asyncio.Lock()
        self._switched_to: str | None = None
        self._floor = ActiveSpeakerFloorRouter(
            session,
            room,
            self._lock,
            debounce_s=floor_debounce_s,
        )
        self._attached = False

    def attach(self) -> None:
        if self._attached:
            return
        self._attached = True
        self._room.on("participant_connected", self._on_participant_connected)
        self._room.on("participant_attributes_changed", self._on_attributes_changed)
        self._room.on("participant_disconnected", self._on_participant_disconnected)
        self._room.on("active_speakers_changed", self._floor.on_active_speakers_changed)
        existing = find_by_role(self._room, "coach")
        if existing is not None:
            self._on_participant_connected(existing)

    def detach(self) -> None:
        if not self._attached:
            return
        self._attached = False
        self._room.off("participant_connected", self._on_participant_connected)
        self._room.off("participant_attributes_changed", self._on_attributes_changed)
        self._room.off("participant_disconnected", self._on_participant_disconnected)
        self._room.off(
            "active_speakers_changed", self._floor.on_active_speakers_changed
        )
        self._floor.disable()
        for task in tuple(self._tasks):
            task.cancel()

    async def drain(self) -> None:
        while self._tasks:
            tasks = tuple(self._tasks)
            await asyncio.gather(*tasks, return_exceptions=True)
        await self._floor.drain()

    def _schedule(self, coro: Any, name: str) -> None:
        task = asyncio.create_task(coro, name=name)
        self._tasks.add(task)

        def _done(done: asyncio.Task[None]) -> None:
            self._tasks.discard(done)
            _log_unhandled_task_error(done, name)

        task.add_done_callback(_done)

    def _on_participant_connected(self, participant: RemoteParticipantLike) -> None:
        if participant_role(participant) != "coach" or self._is_local(participant):
            return
        _log(
            "coach_joined",
            identity=participant.identity,
            role="coach",
            handoff_requested=self._state.handoff_requested,
        )
        self._schedule(self._switch_to_coach(participant.identity), "switch_to_coach")

    def _on_attributes_changed(
        self, changed_attributes: Mapping[str, str], participant: object
    ) -> None:
        if changed_attributes.get("role") != "coach":
            return
        if not hasattr(participant, "identity"):
            return
        self._on_participant_connected(participant)  # type: ignore[arg-type]

    def _on_participant_disconnected(self, participant: RemoteParticipantLike) -> None:
        role = participant_role(participant)
        if role == "player":
            # close_on_disconnect=False turns off the library filter, so apply
            # the same reason set here. A network drop must not end the session.
            reason = getattr(participant, "disconnect_reason", None)
            if reason in DEFAULT_CLOSE_ON_DISCONNECT_REASONS:
                self._schedule(self._end_if_no_player(), "end_if_no_player")
            return
        if role != "coach" and participant.identity != self._switched_to:
            return
        if participant.identity != self._switched_to:
            _log(
                "coach_left",
                identity=participant.identity,
                role=role,
                switched_to=self._switched_to,
                action="ignored_duplicate",
            )
            return
        self._schedule(
            self._recover_to_player(participant.identity), "recover_to_player"
        )

    async def _switch_to_coach(self, identity: str) -> None:
        async with self._lock:
            if self._switched_to == identity:
                _log(
                    "coach_switch_skipped", identity=identity, reason="already_switched"
                )
                return
            if self._switched_to is not None:
                logger.warning(
                    json.dumps(
                        {
                            "event": "coach_switch_skipped",
                            "kept": self._switched_to,
                            "ignored": identity,
                            "reason": "coach_already_active",
                        }
                    )
                )
                return
            coach = _participant_by_identity(self._room, identity)
            if coach is None or participant_role(coach) != "coach":
                _log(
                    "coach_switch_skipped",
                    identity=identity,
                    reason="coach_missing_or_untrusted",
                )
                return

            started = time.perf_counter()
            briefing = build_coach_briefing(
                self._session,
                self._slide_state.current_slide,
                user_turn_count=self._state.user_turn_count,
            )
            try:
                await self._room.local_participant.send_text(
                    json.dumps(briefing, separators=(",", ":")),
                    topic=COACH_BRIEFING_TOPIC,
                    destination_identities=[identity],
                )
                _log("coach_briefing_sent", identity=identity)
            except Exception as exc:
                self._log_switch_failure(identity, "briefing", exc)
                return

            try:
                # Realtime server turn detection drops allow_interruptions=False.
                speech = self._session.generate_reply(
                    instructions=handoff_line_instructions(briefing),
                    tool_choice="none",
                )
                await speech
                if error := speech.exception():
                    self._log_switch_failure(identity, "handoff_line", error)
                    return
                _log("coach_handoff_line_played", identity=identity)
            except Exception as exc:
                self._log_switch_failure(identity, "handoff_line", exc)
                return

            if _participant_by_identity(self._room, identity) is None:
                _log(
                    "coach_switch_skipped",
                    identity=identity,
                    reason="coach_left_during_handoff",
                )
                return

            try:
                await self._agent.update_instructions(self._clicker_instructions)
                _log("update_instructions", mode="clicker")
            except Exception as exc:
                self._log_switch_failure(identity, "update_instructions", exc)
                await self._rollback_to_presenter(identity, relink_player=False)
                return

            try:
                await self._room.local_participant.set_attributes({"mode": "clicker"})
                _log("mode_set", mode="clicker", identity=identity)
            except Exception as exc:
                self._log_switch_failure(identity, "mode_attribute", exc)
                await self._rollback_to_presenter(identity, relink_player=False)
                return

            old_identity = self._linked_identity()
            if _participant_by_identity(self._room, identity) is None:
                _log(
                    "coach_switch_skipped",
                    identity=identity,
                    reason="coach_left_before_audio_switch",
                )
                await self._rollback_to_presenter(identity, relink_player=False)
                return
            try:
                switch_started = time.perf_counter()
                self._session.room_io.set_participant(identity)
            except Exception as exc:
                self._log_switch_failure(identity, "set_participant", exc)
                await self._rollback_to_presenter(identity, relink_player=True)
                return

            self._switched_to = identity
            self._state.active_coach_identity = identity
            self._floor.enable()
            _log(
                "coach_switch_complete",
                old_identity=old_identity,
                new_identity=identity,
                new_role="coach",
                set_participant_ms=round(
                    (time.perf_counter() - switch_started) * 1000, 2
                ),
                switch_latency_ms=round((time.perf_counter() - started) * 1000, 2),
            )

    async def _recover_to_player(self, coach_identity: str) -> None:
        async with self._lock:
            self._floor.disable()
            self._switched_to = None
            self._state.active_coach_identity = None
            player = find_by_role(self._room, "player")
            errors: list[str] = []
            try:
                await self._agent.update_instructions(self._presenter_instructions)
            except Exception as exc:
                errors.append(f"update_instructions:{type(exc).__name__}")
                self._log_switch_failure(coach_identity, "restore_instructions", exc)
            try:
                await self._room.local_participant.set_attributes({"mode": "presenter"})
            except Exception as exc:
                errors.append(f"mode_attribute:{type(exc).__name__}")
                self._log_switch_failure(coach_identity, "restore_mode_attribute", exc)

            if player is None:
                self._session.shutdown()
                _log(
                    "coach_left",
                    identity=coach_identity,
                    action="session_shutdown",
                    reason="no_player",
                    errors=errors,
                )
                return

            try:
                self._session.room_io.set_participant(player.identity)
            except Exception as exc:
                errors.append(f"set_participant:{type(exc).__name__}")
                self._log_switch_failure(coach_identity, "restore_player", exc)
            _log(
                "coach_left",
                identity=coach_identity,
                action="presenter_restored",
                player_identity=player.identity,
                errors=errors,
            )

    async def _end_if_no_player(self) -> None:
        async with self._lock:
            if find_by_role(self._room, "player") is not None:
                return
            self._floor.disable()
            self._session.shutdown()
            _log("session_shutdown", reason="no_player")

    async def _rollback_to_presenter(
        self, coach_identity: str, *, relink_player: bool
    ) -> None:
        rollback_errors: list[str] = []
        try:
            await self._agent.update_instructions(self._presenter_instructions)
        except Exception as exc:
            rollback_errors.append(f"update_instructions:{type(exc).__name__}")
        try:
            await self._room.local_participant.set_attributes({"mode": "presenter"})
        except Exception as exc:
            rollback_errors.append(f"mode_attribute:{type(exc).__name__}")
        if relink_player and (player := find_by_role(self._room, "player")) is not None:
            try:
                self._session.room_io.set_participant(player.identity)
            except Exception as exc:
                rollback_errors.append(f"set_participant:{type(exc).__name__}")
        self._floor.disable()
        self._switched_to = None
        self._state.active_coach_identity = None
        _log(
            "coach_switch_rolled_back",
            identity=coach_identity,
            errors=rollback_errors,
        )

    def _log_switch_failure(
        self, identity: str, stage: str, exc: BaseException
    ) -> None:
        logger.error(
            json.dumps(
                {
                    "event": "coach_switch_failed",
                    "identity": identity,
                    "stage": stage,
                    "error_type": type(exc).__name__,
                    "error": str(exc),
                }
            )
        )

    def _is_local(self, participant: object) -> bool:
        return getattr(participant, "identity", None) == getattr(
            self._room.local_participant, "identity", None
        )

    def _linked_identity(self) -> str | None:
        linked = self._session.room_io.linked_participant
        return linked.identity if linked is not None else None


def _participant_by_identity(
    room: RoomLike, identity: str
) -> RemoteParticipantLike | None:
    participant = room.remote_participants.get(identity)
    if participant is not None:
        return participant
    return next(
        (
            item
            for item in room.remote_participants.values()
            if item.identity == identity
        ),
        None,
    )
