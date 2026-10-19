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
