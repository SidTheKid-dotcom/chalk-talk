# 14 — Observability and full browser-room audio E2E

## Goal
The complete demo is exercised through real audio in a real LiveKit Cloud room with the browser player, a separately connected coach process, interruption, handoff, clicker commands and recovery, with durable evidence for every step.

## Context
- Product: `docs/PRODUCT.md#demo-script`, `#hidden-depth-panel-player-view`, `#acceptance-criteria-per-brief-requirement`
- Contract: `docs/ARCHITECTURE.md#sequence-interruption`, `#observability-for-the-panel`
- Decisions: ADR-003, ADR-006, ADR-009, ADR-010, ADR-024, ADR-025, ADR-026
- LiveKit docs: debugger audio mode cannot interrupt; use a real room participant or audio simulation for barge-in.
- The simulator/transport spike depends on merged task 11 and may run in parallel with tasks 12-13. The final scenario depends on merged task 13.

## Parallel prework
- Prove a test-owned sidecar can subscribe to room audio, run an independent OpenAI Realtime player or coach session, and publish generated PCM through the browser participant's synthetic microphone without exposing the key or adding a mock product path.
- Keep the driver outside app code under `evals/e2e/`. Use unique room/identity names and never attach to the production demo room.
- Establish deterministic fixed-audio fallback and event recording before the final app exists. Do not claim end-to-end success until the task-13 browser surfaces and handoff are integrated.

## Scope
- Finish the player status panel with measured turn count, agent state, available realtime end-to-end latency, interruption count and heard-text trace. Show `—` when a metric is unavailable.
- Add a gitignored-output E2E driver under `evals/e2e/`. It must not add a mock path to the app.
- Drive the player as a real room participant publishing spoken audio while the real `/player` browser is connected and acknowledging RPCs.
- Drive the coach as a separate real room participant with `role=coach`. Prefer an OpenAI Realtime-backed conversational process; if that path cannot produce deterministic evidence, use OpenAI-generated spoken clips and record the reason. Never expose the OpenAI key to the browser.
- Record timestamped participant, transcript, tool, RPC ack, attribute, interruption and mode-switch events. Capture browser screenshots at required demo beats.
- Run the complete demo sequence: greeting/slide 1, LeBron, play animation, interruption to Kyrie, highlight, coach request, coach join/briefing, silent clicker topic change, addressed callout, coach leave, player recovery.
- For interruption, overlap a spoken player turn with active agent playout in the room. Verify the assistant `ChatMessage.interrupted` flag and stored heard text; do not infer interruption only from UI state.
- Fail the E2E run when an expected tool/ack/mode/slide is absent, an unexpected session close occurs, or a forbidden narration/tool appears.
- Save recordings and event JSON outside git, and write a concise public evidence summary without secrets or raw credentials.

## Out of scope
- Production deployment and Loom editing.

## Acceptance checks
| Check | How to verify | Evidence required |
|---|---|---|
| Full spoken path | execute E2E driver against local agent/web plus LiveKit Cloud | recording, transcript and event JSON |
| Browser truth | browser `/player` supplies real RPC acks throughout | screenshots and ack sequence |
| Interruption | player speech overlaps agent playout | interrupted message flag, truncated heard text and stopped playout |
| Handoff | separate coach joins and receives private briefing | participant identities/roles, private stream evidence, coach screenshot |
| Clicker | unaddressed coach speech then addressed tool request | silence first; expected tool and both screens updated second |
| Recovery | coach disconnects and player speaks | same session survives and presenter mode resumes |
| Full checks | agent/web tests, lint, typecheck, secret scan | exact output |
| Shutdown | stop processes and list rooms | no orphan processes or rooms |

## Checklist
- [ ] Implemented
- [ ] Lint and typecheck pass
- [ ] Tests pass (list)
- [ ] Acceptance checks pass with evidence
- [ ] Screenshots and recording attached outside git
- [ ] LEARNINGS.md updated if needed
- [ ] README and PROGRESS.md updated

## Report (executor fills)
- Files changed:
- Commands run and key output:
- E2E evidence paths:
- Not done / not verified:
