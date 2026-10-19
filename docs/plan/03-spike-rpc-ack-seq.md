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
- [ ] Implemented
- [ ] Lint and typecheck pass
- [ ] Tests pass (list)
- [ ] Acceptance checks pass with evidence
- [ ] Screenshots attached (UI tasks)
- [ ] LEARNINGS.md updated (if any surprise)
- [ ] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- Files changed:
- Commands run and key output:
- Not done / not verified:
