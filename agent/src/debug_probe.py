from __future__ import annotations

import asyncio
import json
import logging
import os
from statistics import median
from typing import Any

from livekit.rtc import RpcInvocationData

from deck_data import SLIDE_IDS
from slide_commander import SlideCommander

logger = logging.getLogger("agent")

DEBUG_PROBE_METHOD = "debug_probe"


def debug_enabled() -> bool:
    return os.environ.get("CHALK_DEBUG") == "1"


class DebugSlideCommander(SlideCommander):
    """Dev-only helpers for the CHALK_DEBUG probe. Production does not use this class."""

    def __init__(self, room: Any, deck: dict[str, Any] | None = None) -> None:
        super().__init__(room, deck)
        self._dead_tab_armed = False
        self._dead_tab_task: asyncio.Task[None] | None = None

    def arm_dead_tab(self) -> None:
        self._dead_tab_armed = True

    def on_participant_disconnected(self, participant: Any) -> None:
        if not self._dead_tab_armed:
            return
        identity = getattr(participant, "identity", "")
        role = participant.attributes.get("role") if participant.attributes else None
        if role != "player" and identity != self._player_identity:
            return
        self._dead_tab_armed = False
        self._dead_tab_task = asyncio.create_task(
            self._dead_tab_once(),
            name="dead-tab-show-slide",
        )
        self._dead_tab_task.add_done_callback(_log_task_error)

    async def send_raw(
        self,
        method: str,
        payload: dict[str, Any],
        *,
        bump_seq: bool = True,
        kind: str = "slide",
    ) -> str:
        async with self._lock:
            body = dict(payload)
            if bump_seq:
                self._seq += 1
                body["seq"] = self._seq
            return await self._rpc(method, body, kind=kind)

    async def _dead_tab_once(self) -> None:
        result = await self.show_slide(self._current_slide or SLIDE_IDS[0])
        logger.info(
            json.dumps(
                {
                    "event": "dead_tab_result",
                    "result": result,
                }
            )
        )


def _log_task_error(task: asyncio.Task[None]) -> None:
    if task.cancelled():
        return
    exc = task.exception()
    if exc is not None:
        logger.error(
            json.dumps(
                {
                    "event": "background_task_error",
                    "task": task.get_name(),
                    "error": str(exc),
                }
            )
        )


def _reject_non_player(
    commander: SlideCommander, data: RpcInvocationData
) -> str | None:
    role = commander.role_of(data.caller_identity)
    if role == "player":
        return None
    return json.dumps(
        {
            "ok": False,
            "error": "player role required",
            "caller_identity": data.caller_identity,
            "role": role,
        }
    )


async def run_script(commander: DebugSlideCommander) -> dict[str, Any]:
    """Drive SlideCommander against the real player. No model turns."""
    steps: list[dict[str, Any]] = []

    for index in range(10):
        slide_id = SLIDE_IDS[index % len(SLIDE_IDS)]
        result = await commander.show_slide(slide_id)
        steps.append(
            {"step": f"show_{index + 1}", "slide_id": slide_id, "result": result}
        )

    stale = await commander.send_raw(
        "show_slide",
        {"slide_id": commander.current_slide or SLIDE_IDS[0], "seq": 1},
        bump_seq=False,
        kind="slide",
    )
    steps.append({"step": "stale_seq", "result": stale})

    unknown = await commander.send_raw(
        "show_slide",
        {"slide_id": "s9_nope"},
        bump_seq=True,
        kind="slide",
    )
    steps.append({"step": "unknown_slide", "result": unknown})

    off_slide = await commander.send_raw(
        "highlight",
        {"slide_id": commander.current_slide or "s4_offense", "target": "k_jr_card"},
        bump_seq=True,
        kind="highlight",
    )
    steps.append({"step": "off_slide_highlight", "result": off_slide})

    mismatch = await commander.send_raw(
        "highlight",
        {"slide_id": "s3_kyrie", "target": "cle_irving"},
        bump_seq=True,
        kind="highlight",
    )
    steps.append({"step": "slide_mismatch", "result": mismatch})

    commander.arm_dead_tab()
    times = list(commander.round_trips_ms)
    summary = {
        "event": "rpc_roundtrip_summary",
        "n": len(times),
        "min_ms": min(times) if times else None,
        "median_ms": round(median(times), 1) if times else None,
        "max_ms": max(times) if times else None,
        "samples_ms": times,
    }
    logger.info(json.dumps({"event": "debug_probe_armed_dead_tab"}))
    logger.info(json.dumps(summary))
    logger.info(json.dumps({"event": "debug_probe_script_done", "steps": len(steps)}))
    return {"steps": steps, "armed_dead_tab": True, "round_trips": summary}


async def handle_debug_probe(
    commander: DebugSlideCommander, data: RpcInvocationData
) -> str:
    if not debug_enabled():
        return json.dumps({"ok": False, "error": "debug_probe disabled"})

    rejected = _reject_non_player(commander, data)
    if rejected is not None:
        return rejected

    try:
        body = json.loads(data.payload) if data.payload else {}
    except json.JSONDecodeError:
        body = {}
    if not isinstance(body, dict):
        body = {}

    action = str(body.get("action") or "script")
    if action == "dead_tab":
        result = await commander.show_slide(commander.current_slide or SLIDE_IDS[0])
        return json.dumps({"ok": True, "action": "dead_tab", "result": result})

    if action == "show_slide":
        slide_id = str(body.get("slide_id") or SLIDE_IDS[0])
        result = await commander.show_slide(slide_id)
        return json.dumps({"ok": True, "action": "show_slide", "result": result})

    if action == "highlight":
        target = str(body.get("target") or "")
        result = await commander.highlight(target)
        return json.dumps({"ok": True, "action": "highlight", "result": result})

    if action == "stale_highlight":
        result = await commander.send_raw(
            "highlight",
            {
                "slide_id": commander.current_slide or SLIDE_IDS[0],
                "seq": 1,
                "target": str(body.get("target") or "cle_james"),
            },
            bump_seq=False,
            kind="highlight",
        )
        return json.dumps({"ok": True, "action": "stale_highlight", "result": result})

    if action == "stale_slide":
        result = await commander.send_raw(
            "show_slide",
            {"slide_id": commander.current_slide or SLIDE_IDS[0], "seq": 1},
            bump_seq=False,
            kind="slide",
        )
        return json.dumps({"ok": True, "action": "stale_slide", "result": result})

    if action == "run_play":
        play_id = str(body.get("play_id") or "p_blitz_lebron_pnr")
        result = await commander.run_play(play_id)
        return json.dumps({"ok": True, "action": "run_play", "result": result})

    if action == "add_callout":
        fact_id = body.get("fact_id")
        text = body.get("text")
        result = await commander.add_callout(
            str(fact_id) if fact_id is not None else None,
            str(text) if text is not None else None,
        )
        return json.dumps({"ok": True, "action": "add_callout", "result": result})

    if action == "stale_play":
        result = await commander.send_raw(
            "run_play",
            {
                "slide_id": commander.current_slide or "s2_lebron",
                "seq": 1,
                "play_id": str(body.get("play_id") or "p_blitz_lebron_pnr"),
            },
            bump_seq=False,
            kind="play",
        )
        return json.dumps({"ok": True, "action": "stale_play", "result": result})

    if action == "stale_callout":
        result = await commander.send_raw(
            "add_callout",
            {
                "slide_id": commander.current_slide or SLIDE_IDS[0],
                "seq": 1,
                "callout_id": "c1",
                "text": "Iguodala on LeBron",
            },
            bump_seq=False,
            kind="callout",
        )
        return json.dumps({"ok": True, "action": "stale_callout", "result": result})

    script = await run_script(commander)
    return json.dumps({"ok": True, "action": "script", **script})


async def register_debug_probe(room: Any, commander: DebugSlideCommander) -> None:
    async def _handle(data: RpcInvocationData) -> str:
        return await handle_debug_probe(commander, data)

    room.local_participant.register_rpc_method(DEBUG_PROBE_METHOD, _handle)
    logger.info(json.dumps({"event": "debug_probe_registered"}))


async def wait_until_shutdown(ctx: Any) -> None:
    done = asyncio.Event()

    async def _on_shutdown(*_args: object) -> None:
        done.set()

    ctx.add_shutdown_callback(_on_shutdown)
    await done.wait()


async def run_debug_job(ctx: Any, commander: DebugSlideCommander) -> None:
    """Join the room without a realtime model so the spike does not burn inference credit."""

    def _on_disconnect(participant: Any, *_: Any) -> None:
        commander.on_participant_disconnected(participant)

    ctx.room.on("participant_disconnected", _on_disconnect)
    await ctx.connect()
    await register_debug_probe(ctx.room, commander)
    logger.info(
        json.dumps(
            {
                "event": "debug_mode",
                "note": "CHALK_DEBUG=1; realtime session skipped; debug_probe is live",
            }
        )
    )
    await wait_until_shutdown(ctx)


__all__ = [
    "DEBUG_PROBE_METHOD",
    "DebugSlideCommander",
    "debug_enabled",
    "handle_debug_probe",
    "register_debug_probe",
    "run_debug_job",
    "run_script",
]
