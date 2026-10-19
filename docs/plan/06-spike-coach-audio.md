# 06 — Spike 1: agent switches audio input from player to coach

## Goal
We know whether `session.room_io.set_participant(coach_identity)` cleanly moves the agent's ear to the coach mid-session with GPT Realtime, and what happens to the player's audio.

## Context
- Risks: `docs/RISKS.md#spike-1-agent-hears-the-coach-after-handoff-highest-risk`
- Contract: `docs/ARCHITECTURE.md#agent-modes-and-the-switch` (`set_participant` takes one identity: verified)
- Decision: ADR-010 (clicker mode; fallbacks A and B)
- Reference: https://github.com/livekit/agents/blob/main/examples/voice_agents/toggle_io.py
- Depends on: 01, 05 (coach token), 03 (show_slide tool, SlideCommander), 08 (model factory; OpenAI is primary). Env: copy `/home/sidvish/Documents/Work/Personal/synthio-take-home/.env`.

## Scope
- Agent: on `participant_connected` with `role=coach` (find by attribute), call `set_participant(coach_identity)`, `update_instructions` to a one-line clicker prompt, set attribute `mode=clicker`. Log each step.
- Automated test (no mic needed): generate short speech clips with the OpenAI TTS API using our key, saved as Ogg Opus (`.ogg`). Clips: coach "Assistant, show the Kyrie slide."; coach "Assistant, go to the LeBron slide."; player "Show me our offense." Then join simulated humans with the lk CLI, for example `lk room join --identity coach-<hex> --attribute role=coach --publish coach1.ogg --exit-after-publish <room>` (check `lk room join --help`). The player can be the real browser tab (for RPC acks) plus a CLI participant publishing the player clip only if the browser cannot. Note: a CLI participant gets its role from `--attribute`, which is fine for this test; the app's token route still owns roles in the product.
- Also test with two tabs on one machine (headphones) or a phone, if a human is available. Optional.
- Coach says "Assistant, show the Kyrie slide." Player then says "Show me LeBron."
- Also test: the coach leaves; does the agent fall back to the player? Record the behavior. Propose (do not build) the rule.

## Pass
Agent responds to the coach and calls `show_slide`. No crash, no realtime session reset. Player audio is ignored (expected, since one identity). Note latency of the switch.

## Fallbacks (planner picks)
- A: agent listens to the coach only after handoff (expected design).
- B: coach taps slides; agent silent in clicker mode.

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Switch happens on coach join | agent log | log lines: coach joined (role), set_participant, mode=clicker |
| Agent hears coach | coach utterance | transcript + show_slide tool call log |
| Agent ignores player | player utterance after switch | log showing no user turn from player |
| Session survives | 3 more coach turns | log, no errors |
| Coach leaves | close coach tab | log of what happens |

## Checklist
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (list)
- [x] Acceptance checks pass with evidence
- [x] Screenshots attached (UI tasks)
- [x] LEARNINGS.md updated (if any surprise)
- [x] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- **Result: PASS.** Fallback A is the observed design (agent hears only the coach after `set_participant`). Do not take fallback B.
- **Switch latency:** `set_participant` 0.66 ms; full switch (`set_participant` + `update_instructions` + `mode=clicker`) **46.23 ms**.
- Files changed:
  - `agent/src/agent.py` — `CoachSwitcher`: `participant_connected` / attributes handler, `session.room_io.set_participant`, one-line clicker `update_instructions`, attribute `mode=clicker`, structured logs, referenced async tasks.
  - `agent/tests/test_agent.py` — unit tests for find-by-role, switch, ignore player, coach leave log without fallback.
  - `docs/plan/06-spike-coach-audio.md` — this report.
  - `LEARNINGS.md`, `docs/RISKS.md`, `docs/ARCHITECTURE.md`, `DECISIONS.md` ADR-010 note.
- Commands run and key output:
  - `uv run ruff check src/agent.py tests/test_agent.py` — All checks passed.
  - `uv run pytest tests/test_agent.py tests/test_slide_commander.py tests/test_model.py tests/test_debug_probe.py -v` — **47 passed**.
  - OpenAI TTS → Ogg Opus clips in gitignored `local-assets/spike-06/` (not committed). Concatenated coach session 61.74 s.
  - `lk agent dev --deployment production` — registered worker `chalk-talk-agent`, job `AJ_gGMZozfEZDCu`, room `fr-1b8b099e0f0c4312`.
  - `pnpm dev` — Ready on http://localhost:3000. Player Start call (no mic in this browser).
  - `lk room join --identity coach-a1b2c3d4 --attribute role=coach --publish coach_session.ogg fr-1b8b099e0f0c4312` (no `--exit-after-publish`).
  - `lk room join --identity player-voice-01 --attribute role=player --publish player_offense.ogg --exit-after-publish` after the switch.
  - Stopped saved PIDs (agent 435212 + children, web 435281 + leftover next 435353, coach 436127). `lk room delete fr-1b8b099e0f0c4312`. `lk room list` empty.
- Acceptance evidence (agent log, room `fr-1b8b099e0f0c4312`):
  - **Switch on coach join:** `{"event": "coach_joined", "identity": "coach-a1b2c3d4", "role": "coach"}` then `RoomIO linked to participant` `coach-a1b2c3d4` then `{"event": "set_participant", "identity": "coach-a1b2c3d4", "linked_identity": "coach-a1b2c3d4", "latency_ms": 0.66}` then `{"event": "update_instructions", "mode": "clicker"}` then `{"event": "mode_set", "mode": "clicker", "identity": "coach-a1b2c3d4", "switch_latency_ms": 46.23}`.
  - **Agent hears coach:** user `"Distant, show the Kyrie slide."` (TTS "Assistant" misheard) then `function_tools_executed` `show_slide` `{"slide_id": "s3_kyrie"}` applied seq 1. Later exact `"Assistant, go to the LeBron slide."` → `s2_lebron`.
  - **Agent ignores player:** `player-voice-01` published `player_offense.ogg` ("Show me our offense.") at 16:03:02 while linked to the coach. **No** `conversation_item_added` user text containing "offense". All four user turns were the coach clips.
  - **Session survives 3 more coach turns:** after the first Kyrie tool call, three more coach turns each called `show_slide` (seq 2 `s2_lebron`, seq 3 `s3_kyrie`, seq 4 `s2_lebron`). No `ERROR` / `async_task_failed` / session reset until the leave test.
  - **Coach leaves:** `closing agent session due to participant disconnect (disable via RoomInputOptions.close_on_disconnect=False)` `participant=coach-a1b2c3d4` `reason=CLIENT_INITIATED` then `{"event": "coach_left", ..., "note": "no fallback implemented; recording default RoomIO behavior"}` then `{"event": "session_close", "reason": "CloseReason.PARTICIPANT_DISCONNECTED", "error": null}`. **No fallback to the player.**
- **Proposed leave rule (not built):** set `RoomInputOptions.close_on_disconnect=False` so a coach hangup does not kill the player session; on `coach_left`, find `role=player` and `set_participant(player_identity)`, restore presenter instructions / `mode=presenter`. If no player remains, then close.
- Player board after the four turns: `slide: How do we stop LeBron?` `seq: 4`.
- Tests pass: `test_clicker_instructions_are_one_line`, `test_find_coach_by_role_when_player_joined_first`, `test_find_coach_returns_none_without_role`, `test_switcher_set_participant_and_clicker_on_coach_join`, `test_switcher_ignores_player_join`, `test_switcher_logs_coach_leave_without_fallback`, plus existing agent/slide_commander/model/debug_probe tests (47 total).
- Screenshots: player session after spike, slide LeBron seq 4 (browser artifact). Not a UI task.
- Not done / not verified:
  - Optional two-tab / phone human test (no human available; CLI TTS used instead).
  - `toggle_io.py` example file is gone from livekit/agents main; verified `RoomIO.set_participant` on installed livekit-agents 1.8.8 instead.
  - Did not change `close_on_disconnect` or build the leave-fallback rule.
  - Web lint/typecheck not run (web not changed).
- Branch: `t3/spike-coach-audio-switch`
