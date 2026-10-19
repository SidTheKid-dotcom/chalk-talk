# 03 — Spike 3: RPC show_slide round trip with ack, timeout and seq

## Goal
The agent's slide commander sends `show_slide` (and `highlight`) to the player by role, gets an ack after paint, handles stale seq, bad ids and a dead tab, and the round trip is measured. This code is kept (ADR-021).

## Context
- Contract: `docs/ARCHITECTURE.md#rpc-methods-agent---browser` (`show_slide`, `highlight`, errors 2001-2007, built-in codes), `#participant-identities-and-attributes`, `#agent-tools` (failure strings), `#overlay-state` (write after ack only)
- Decision: ADR-006, ADR-007, ADR-008, ADR-016, ADR-020, ADR-021
- Risks: `docs/RISKS.md#spike-3-rpc-show_slide-round-trip-with-ack-and-seq`
- Mistakes: `docs/MISTAKES-TO-AVOID.md` rows 2, 3, 4, 5, 12, 13, 23
- Depends on: 01 (scaffold), 02 (deck data copies). Env: copy `/home/sidvish/Documents/Work/Personal/synthio-take-home/.env` to the worktree root and `web/.env.local`.

## Scope
- Agent: `SlideCommander` module. One `asyncio.Lock`, one seq counter, `find_player()` by `role` attribute (never index 0), `perform_rpc(..., response_timeout≈3s)`, map `RpcError` codes and timeouts to the failure strings in the contract, `set_attributes` after `applied: true` only (one call for `current_slide`, `slide_seq`, cleared `overlay_state`). Unit tests with a fake room.
- Agent: `show_slide(slide_id)` function tool that calls the commander; enum from deck data. Tool result returns slide title, notes, fact claims, board menu.
- Live driver: the real agent must send the RPCs to the real player tab. No test participant may pretend to be the player. Drive the agent's `SlideCommander` either with `lk agent debugger` text turns, or with a dev-only agent RPC method `debug_probe` that runs a scripted sequence (disabled unless `CHALK_DEBUG=1`). Pick one and explain why in the report.
- Web: `useDeckCommands` hook. Registers `show_slide` and `highlight` in `useEffect`, unregisters in cleanup. Validates payload against deck data. Keeps `last_applied_seq`. Acks after the next paint (`requestAnimationFrame` twice, or the method you measure as correct; justify). Throws `RpcError` 2001/2002/2003/2004/2007. A plain placeholder view shows the current slide title and highlighted targets (no styling; task 07 does looks).
- Web: unit tests (Vitest) for the seq and validation logic as a pure reducer.
- Coach late join of `overlay_state`: read-only render from the agent attribute on a second tab. A minimal check is enough here.

## Out of scope
- `run_play`, `add_callout`, the callout rule, styling, prompts beyond one line for `show_slide`, the token route.

## Steps
1. Commander + unit tests (fake RPC: ack, stale, RpcError each code, timeout, missing player).
2. Hook + reducer tests.
3. Live run: 10 increasing slides, 1 stale seq, 1 unknown slide id, 1 highlight off-slide, 1 slide mismatch, then close the player tab and call once more.
4. Log each round trip (ms) as structured log lines. Report min / median / max.

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Acks after paint | live run | log lines with seq, applied, round-trip ms; min/median/max |
| Stale seq not rendered | live run + reducer test | ack with `applied:false, reason:stale`; screenshot shows previous slide |
| Unknown id → 2001 | live run | agent log with code 2001 and the failure string returned to the model |
| Off-slide highlight → 2004, mismatch → 2007 | live run | log lines |
| Dead tab → failure string | close tab, call again | log line showing 1501/1502/1503 or recipient not found, and the FAILED string |
| Attributes only after ack | unit test | test name + output |
| Player found by role | unit test with coach joined first | test name + output |
| Handlers unregistered on unmount | Vitest or React test | test output |
| Late-join render | open a second tab after 3 slide changes | screenshot showing the current slide |

## Checklist
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (list)
- [x] Acceptance checks pass with evidence
- [x] Screenshots attached (UI tasks)
- [x] LEARNINGS.md updated (if any surprise)
- [x] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)

### Driver choice
Used the dev-only agent RPC `debug_probe` (gated by `CHALK_DEBUG=1`), not `lk agent debugger`. Another executor was burning LiveKit Inference credit on evals. `debug_probe` calls `SlideCommander` directly with no RealtimeModel turn, so this spike used zero inference minutes. When `CHALK_DEBUG=1`, the job skips `AgentSession` and stays in the room to serve the probe. The player tab still issues a real nested RPC to the real agent; the agent still `perform_rpc`s to the real player found by `role=player`.

Ack after paint: two `requestAnimationFrame`s (`web/lib/deck/rpc.ts` `afterNextPaint`). The first rAF runs before the next paint; the second runs after that paint. Applied `show_slide` round trips of 103.5–121.7 ms are consistent with two frames plus LiveKit Cloud RPC.

### Files changed
- `agent/src/deck_data.py` (new)
- `agent/src/slide_commander.py` (new)
- `agent/src/debug_probe.py` (new)
- `agent/src/agent.py` (`show_slide` tool + CHALK_DEBUG path)
- `agent/tests/test_slide_commander.py` (new)
- `web/lib/deck/commands.ts` (new)
- `web/lib/deck/commands.test.ts` (new)
- `web/lib/deck/rpc.ts` (new)
- `web/lib/deck/rpc.test.ts` (new)
- `web/hooks/useDeckCommands.ts` (new)
- `web/components/app/deck-placeholder.tsx` (new)
- `web/components/app/view-controller.tsx` (mount placeholder on the session page)
- `web/app/coach/page.tsx` (late-join render from agent attributes)
- `LEARNINGS.md`
- `docs/plan/03-spike-rpc-ack-seq.md` (this report)

Not committed: worktree `.env` and `web/.env.local` (copied from `/home/sidvish/Documents/Work/Personal/synthio-take-home/.env`, with `CHALK_DEBUG=1` added). Did not touch `web/components/deck/` or `web/app/lab/`.

### Commands run and key output
APIs checked in installed SDKs (and LiveKit docs MCP / `lk docs` where available) before use:
- Python `rtc.LocalParticipant.perform_rpc`: keyword-only, `response_timeout: float | None` in seconds, default 10. Spike uses `3.0`.
- Python `rtc.RpcError(code, message)` plus built-in 1400/1401/1500–1505.
- Python `local_participant.set_attributes(attributes: dict[str, str])`.
- JS `room.registerRpcMethod` / `unregisterRpcMethod`; `new RpcError(code, message)`.
- Agent `ctx.add_shutdown_callback` to unregister `debug_probe`.

```
cd agent && uv run ruff check src tests
All checks passed!

cd agent && uv run pytest -q
......................                                                   [100%]
22 passed in 1.35s

cd web && pnpm exec vitest run
 Test Files  4 passed (4)
      Tests  30 passed (30)

cd web && pnpm exec tsc --noEmit
(exit 0)

cd web && pnpm lint
(exit 0; pre-existing warnings only, none in the new files)
```

Live: `make agent-dev` (this worktree, `lk agent dev --deployment production`, worker pid 417714) and `make web-dev` (next-server 416691). Player `/player`, then coach `/coach?room=fr-ae7331fb3b224145` after seq 10. Stopped by PID (416566, 417714, 416691, …). Did not kill the other worktree's next on 3001.

### Acceptance evidence
Room `fr-ae7331fb3b224145`. Structured lines from `/tmp/chalk-agent-03.log`.

**Acks after paint.** Ten applied `show_slide` calls, seq 1–10, each `applied: true` after two rAFs:

| seq | slide_id | round_trip_ms |
|---|---|---|
| 1 | s1_tipoff | 117.9 |
| 2 | s2_lebron | 103.5 |
| 3 | s3_kyrie | 117.6 |
| 4 | s4_offense | 119.3 |
| 5 | s5_xfactors | 116.8 |
| 6 | s6_last_two | 121.7 |
| 7 | s1_tipoff | 115.5 |
| 8 | s2_lebron | 117.9 |
| 9 | s3_kyrie | 112.7 |
| 10 | s4_offense | 113.9 |

`rpc_roundtrip_summary` n=10 **min 103.5 ms, median 117.2 ms, max 121.7 ms**. (Log printed `median_ms: 117.19999999999999`; `round(..., 1)` was added after the run.)

**Stale seq not rendered.** Live: seq 1 resent while last applied was 10: `applied: false, reason: stale`, 89.9 ms. Player screenshot still `s4_offense` / seq 10. Reducer: `commands.test.ts` "does not render a stale seq".

**Unknown id → 2001.** `slide_id: s9_nope`, `code: 2001`, failure `FAILED: slide not shown (unknown slide_id). Do not describe it as on screen.`

**Off-slide highlight → 2004, mismatch → 2007.** Highlight `k_jr_card` on `s4_offense` → 2004 `unknown target, or target not on this slide`. Highlight `cle_irving` with payload `slide_id: s3_kyrie` while screen is `s4_offense` → 2007 `slide mismatch`. Both mapped to `FAILED: highlight not shown (...)`.

**Dead tab.** Player left the room; commander sent `show_slide` again: `code: 1401`, `reason: player not found`, `FAILED: slide not shown (player not found). Do not describe it as on screen.` (1401 rather than 1501–1503 because `find_player()` returned none after disconnect, so no `perform_rpc` was issued.)

**Attributes only after ack.** `test_attributes_only_after_ack` and `test_stale_ack_does_not_write_attributes` (passed). Fake RPC error / stale ack → `attribute_calls == []`. Applied ack writes `current_slide`, `slide_seq`, cleared `overlay_state` in one `set_attributes`.

**Player found by role.** `test_find_player_by_role_when_coach_joined_first` (passed). Coach identity is first in the map; `find_player()` still returns `player-bbb`.

**Handlers unregistered on unmount.** `bindDeckRpc` Vitest: `unregisters show_slide and highlight on cleanup` (passed). `unbind()` calls `unregisterRpcMethod` for both and clears handlers.

**Late-join render.** Coach tab opened after seq 10. Screenshot: `Connected as Coach in fr-ae7331fb3b224145`, slide `Our offense: Steph and Klay off screens, Draymond as playmaker`, seq 10, highlights none. Same slide as the player placeholder.

Screenshots:
- Player after probe (stale left s4 / seq 10): `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvf3j049-8ca7c052.png`
- Coach late join: `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mvf3jkaj-458aaac5.png`

### Not done / not verified
- Did not run `lk agent debugger` (inference-capped; `debug_probe` substituted).
- Did not verify a built-in 1501/1502/1503 dead-tab path live; disconnect was observed as 1401 `player not found`. Those codes are mapped in unit tests (`test_rpc_error_maps_to_failure_string`).
- `run_play` / `add_callout` not implemented (out of scope).
- No styled deck components (task 07).
- Embedded browser has no mic (`getUserMedia` NotFoundError on the player page). Fine for this RPC spike.
- README / DECISIONS / FACTS unchanged; only LEARNINGS and this task file.
- Not pushed. Not merged.

## Round 2 (auditor CHANGES REQUIRED)

Kept 2003 on both sides. `initialDeckState.ready` is false; `useDeckCommands` sets ready when the deck mounts (`markDeckReady`) and clears it on unmount.

### Files changed
- `agent/src/slide_commander.py` — parse `applied:false` as FAILED for slide and highlight; map 1402/1403/1404/1504; `max_round_trip_latency=2.0`; catch `set_attributes`; drop debug helpers
- `agent/src/debug_probe.py` — `DebugSlideCommander` subclass; reject non-player callers; stale_slide / stale_highlight actions
- `agent/src/agent.py` — import `SlideId` from `deck_data`; debug path uses `DebugSlideCommander`
- `agent/tests/test_slide_commander.py` — stale highlight, set_attributes failure, extra RPC codes
- `agent/tests/test_debug_probe.py` — role gate; production commander has no debug helpers
- `web/lib/deck/commands.ts` — ready false until mount; `seedDeckFromAgent` resets seq on identity change
- `web/lib/deck/commands.test.ts` / `web/lib/deck/rpc.test.ts` / `web/lib/deck/rpc.ts` / `web/hooks/useDeckCommands.ts`
- `web/components/app/deck-placeholder.tsx` — stale slide/highlight probe buttons
- `LEARNINGS.md`

### Commands run
```
cd agent && uv run pytest -q && uv run ruff check
32 passed in 1.32s
All checks passed!

cd web && pnpm exec vitest run && pnpm exec tsc --noEmit && pnpm lint
Test Files  4 passed (4)
Tests  35 passed (35)
tsc exit 0; lint pre-existing warnings only
```

### Not done / not verified
- Optional live re-check of one stale highlight and one stale slide was not run this round (unit tests cover both).
- Not pushed.
