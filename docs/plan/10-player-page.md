# 10 — /player page: the styled deck driven by RPC

## Goal
`/player` shows the Scouting Packet deck from the lab components, driven live by the agent's `show_slide` and `highlight` RPCs, with the live caption, a working status strip, clear mic and session-ended messages, and visible photo credits.

## Context
- Design: `docs/DESIGN-BRIEF.md` (all), lab components in `web/components/deck/`, `/lab` screenshots via `web/scripts/shoot.mjs`
- Contract: `docs/ARCHITECTURE.md#rpc-methods-agent---browser`, `#participant-identities-and-attributes`, `#late-join-and-reconnect`
- Existing code: `web/hooks/useDeckCommands.ts`, `web/lib/deck/commands.ts`, `web/lib/deck/rpc.ts` (task 03), placeholder `web/components/app/deck-placeholder.tsx`
- Decisions: ADR-008, ADR-016, ADR-018
- Follow-ups from the planner's lab review (in `PROGRESS.md`): fact card must not cover the Photo credits link, cutouts or markers; move it into the left column. Coach view stamp vs clip (coach page is task 12; skip here).
- Mistakes: rows 9, 10, 11, 12

## Scope
- Route `/player` renders the session UI with the real `SlideView` (from `web/components/deck/`) in place of the placeholder. `/` redirects to `/player`. Keep the token flow from task 05 (`POST /api/token` role player).
- Deck state comes only from `useDeckCommands` (RPC) and, on connect or reconnect, the agent's `current_slide` / `overlay_state` attributes (already handled by the hook). Highlights from the `highlight` RPC render as the gold highlighter swipe on the marker or zone.
- Before connect: a start screen in the Scouting Packet style (title, one line on what this is, "Start film session" button, mic note). No starter LiveKit branding.
- Live caption: the agent's current spoken line in serif italic (Fraunces italic) from the agent transcription stream (`lk.transcription` or the starter's transcript hook; check what the starter uses). One line, latest segment.
- Status strip: state pill from `lk.agent.state` (Listening / Thinking / Speaking); `turn NN` counts agent turns; `latency — ms` and `interruptions —` stay "—" (task 13 fills them); `Coach —` stays until task 12.
- Mic failure: catch `getUserMedia` errors and show a clear message on the sheet ("Microphone blocked or missing. Allow mic access and reload."). No unhandled runtime error overlay.
- Session ended: when the agent leaves or the room disconnects, show a message ("The film session ended.") with a restart button.
- Fact card placement: move the featured fact card into the left column below the points; it must not overlap the Photo credits link, cutouts or court markers. Photo credits link visible on every slide.
- Remove the deck placeholder component if unused.
- Playwright: extend `web/scripts/shoot.mjs` (or add `shoot-player.mjs`) to screenshot `/player` with a mocked deck state is NOT allowed in the demo path; instead screenshot the real page after connecting, plus `/lab` for each slide to prove no overlaps. A test asserts the credits link bounding box does not intersect the fact card.

## Out of scope
- Board tools beyond highlight, coach page, status metrics, agent changes.

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| Tests, lint, types | `cd web && pnpm test && pnpm lint && pnpm exec tsc --noEmit` | output |
| Live slides | `make agent-dev` with `CHALK_DEBUG=1` (no model turns): debug_probe drives show_slide s1..s6 and two highlights | screenshots of `/player` for 3 slides and one highlight |
| Live with model | `make agent-dev` without debug; Start call; type "How do we stop LeBron?" (no mic in the embedded browser) | screenshot of slide 2 with the caption line; agent log of the applied show_slide |
| Late join | open a second `/player`-style viewer is not needed; reload the player tab mid-session | screenshot shows the current slide restored from attributes |
| Mic message | embedded browser (no mic) | screenshot of the message, no error overlay |
| Session ended | stop the agent | screenshot of the ended message |
| No overlaps | lab screenshots + overlap test | test output and 6 slide screenshots |
| Shutdown | stop PIDs, `lk room list` | empty list |

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
