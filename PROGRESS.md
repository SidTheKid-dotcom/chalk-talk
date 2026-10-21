# Progress

## Now
Local app. Next.js serves `/player` and `/coach`. The Python worker is `lk agent dev` against a LiveKit Cloud room. No `livekit.toml` and no Vercel project config are in the repo. The README links the demo video and says there is no hosted deployment.

The opening board is blank. Slide 1 is a later `show_slide` after the player asks for the plan. Coach leave restores presenter mode and the player ear. After handoff, a 200 ms floor router can link either human. Play steps follow `lk.agent.state`. Realtime defaults to the OpenAI plugin, then LiveKit Inference. There is no STT-LLM-TTS pipeline and no `evals/` harness.

Cut, and still absent: task 14 E2E driver, task 04 harness, and the latency/trace panel (`StatusStrip` is not mounted). The rail shows Listening, Thinking, Speaking, or Waiting.

## Done
- Scaffold: agent guides, product spec, architecture contracts, decisions, risks, references, facts template.
- `lk` CLI installed and authed to project `chalk-talk`. LiveKit agent skills and docs MCP config added.
- `[UNVERIFIED]` pass on ARCHITECTURE and RISKS with `lk docs`. ADR-019 to ADR-022.
- Task files 01-07 written.
- 01 setup merged: agent on gpt-realtime-2.1 with explicit dispatch, web starter, Makefile. Spoken mic turn not yet verified (no mic in executor browser).
- 06 Spike 1 merged: coach audio switch works mid-session (0.66 ms, no realtime reset). ADR-025: coach leave returns to player; model judges 'addressed'.
- 07 UI lab merged: all six slides, coach view and primitives at /lab from deck data; marker overlap test.
- 03 Spike 3 merged: RPC ack after paint, median 117 ms; stale, error codes, hidden tab, agent restart, frozen tab bound all handled.
- 08 model merged: OpenAI plugin first, LiveKit Inference fallback (RealtimeModelFallbackAdapter). Inference credit likely spent (429).
- 05 token route merged: role in token, mic-only, coach room pattern, no human attribute edits, room timeouts and cap.
- 02 deck and facts merged: 19 facts re-verified by auditor, 6 slides, 4 plays, 25 deck tests incl. basketball sanity rules.
- 09 presenter merged: deck-generated routing and grounded tool results; acked slide 1 before greeting; startup race retries; 70 agent tests plus provider-backed behavior checks; second audit PASS.
- 10 player page merged: Scouting Packet start/live/ended states, real RPC deck, captions and typed fallback; 49 web tests, six-slide overlap check and second audit PASS.
- 11 board tools merged: locked shared seq, acked highlight/play/callout state, guarded claims and deck-driven play motion; 99 agent tests, 72 web tests, live mid-motion evidence and second audit PASS.
- 12 Hardwood merged: fixed 16:9 stage, large type, slide push, play captions/ghosts, unscaled 44px controls. Planner reviewed r2 stills (slide 5 strip, full-width push, play steps 2/4, three control viewports, portrait rotate hint). `pnpm test` 79 passed.
- 13A handoff core merged: `call_head_coach`, private briefing, clicker switch, floor router, camera grants; 117 agent tests.
- 13B coach UI merged: player QR + copyable join link, Hardwood `/coach` with private briefing, live clicker + leave recovery. Video rail cut. `pnpm test` 90 passed. Live room: coach `show_slide` s2 136 ms, highlight 410 ms; player command after coach intact (no ADR-028 fallback).
- Speech-paced play motion merged (ADR-029): captioned `run_play` steps advance only while `lk.agent.state` is `speaking`. Scripted stills at 5s stay on "Tag the roller behind" vs wall-clock last step. Player and coach pass the speaking flag; `/lab` stays wall-clock. Not live-mic verified.
- Camera rail: player and coach publish camera after connect (mic still starts if camera is denied). Human tiles from `role` / guests, agent excluded, gold border on `activeSpeakers`. `/lab` keeps placeholder tiles.

## Next
Waves 0-3 in the table below are the work already merged, except the eval harness and the metrics panel. Wave 4 (deploy) has no project files here. Wave 5 is not started. Do not read this table as a claim that those gates are still open.

| Wave | Tasks | Gate |
|---|---|---|
| 0 | 01 setup, 02 deck and facts | none |
| 1 | 03 spike RPC, 04 spike tool order, 05 token route, 07 UI lab | 01 and 02 merged |
| 1b | 06 spike coach audio | 03 and 05 merged |
| 2 | presenter agent, /player slides | spikes pass or fallbacks chosen |
| 3 | board tools, handoff + /coach, status panel, eval | wave 2 |
| 4 | deploy | not started; no Cloud agent or Vercel config in the repo |
| 5 | freeze: E2E, secret scan, UI audit | deploy |

## Blocked
- Task 04 harness: not in the repo. There is no `evals/` tree to score.

## Handoff behavior now in the agent
- `RoomOptions(close_on_disconnect=False)`. On coach leave the floor router disables, presenter instructions and `mode=presenter` are restored, then `set_participant(None)` and `set_participant(player)`.
- Switch order: store and send the briefing, handoff line, clicker instructions, `mode=clicker`, `set_participant(coach)`, then enable the floor router. Failures before the ear switch roll back.
- Attributes-changed handler runs only when `changed_attributes["role"] == "coach"`.
- `CoachSwitcher` lives in `agent/src/coach_switcher.py`. Transcript logs are behind `CHALK_SESSION_DEBUG=1`.

## Floor router
- After handoff, either trusted human can take the ear after 200 ms. The first words of a new speaker can be clipped. The ADR-028 coach-only fallback is not behind a flag; the router stays on.
- If both briefing writes fail, or the handoff line fails, that coach is not switched until they rejoin. A failed text stream still continues when `coach_briefing` was stored.

## Ship checklist (not done unless noted)
- README known limits already include the bearer coach link and the lack of a token-route rate limit. They do not state a cold-start time. This repo has not measured one.
- A Vercel deploy is not configured. `/player` throws at import if `LIVEKIT_URL` is unset, so a build that loads that module needs the variable. The token route also requires `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` and `AGENT_NAME` when it is called.
- No Cloud agent is configured. `AGENT_NAME` is required at worker import. After a future `lk agent create`, local dev must set `LIVEKIT_AGENT_DEPLOYMENT` so it does not take the production deployment name.
- No session-length cap is in the agent.
- Realtime factory logs the model class and each fallback id, parses providers once, and validates them at import unless `CHALK_DEBUG=1`.
- `/player` ends the session on an explicit agent failure or when a live agent finishes. The ended screen says the film session ended.
- `CHALK_DEBUG=1` skips the realtime session and registers `debug_probe`. Do not set it on a shared worker.
- Planning files (`CLAUDE.md`, `AGENTS.md`, `docs/plan/`) are in the repo.
