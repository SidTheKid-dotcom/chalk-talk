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
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (40 tests across 6 files)
- [ ] Acceptance checks pass with evidence (live model slide change, mic failure, desktop/mobile, end state, and six-slide overlap checks passed; limitations below)
- [x] Screenshots captured (UI task)
- [x] LEARNINGS.md updated (debug-probe startup state and same-room reload/token behavior)
- [ ] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)
- Files changed: `LEARNINGS.md`; `web/app/layout.tsx`; `web/app/page.tsx`; `web/app/player/layout.tsx`; `web/app/player/page.tsx`; `web/components/app/app.tsx`; `web/components/app/deck-placeholder.tsx` (removed); `web/components/app/view-controller.tsx`; `web/components/app/welcome-view.tsx`; `web/components/deck/HalfCourt.tsx`; `web/components/deck/NoteCard.tsx`; `web/components/deck/SlideView.tsx`; `web/components/deck/StatusStrip.tsx`; `web/lib/player.ts`; `web/lib/player.test.ts`; `web/scripts/shoot.mjs`; `web/styles/scouting.css`; this task report.
- Commands run and key output:
  - `cd web && pnpm test` — exit 0; 6 test files passed, 40 tests passed.
  - `cd web && pnpm lint` — exit 0; Next lint emitted the existing unused `error` warning in `components/agents-ui/agent-audio-visualizer-aura.tsx:34` and unnecessary `_barCount` dependency warning in `components/agents-ui/agent-audio-visualizer-radial.tsx:162`.
  - `cd web && pnpm exec tsc --noEmit` — exit 0, no output.
  - `cd web && pnpm shoot` — exit 0. The six slide renders each reported `fact card clears credits, cutouts, and court markers`; coach, fallback, and reduced-motion captures also completed. PNGs: `web/screenshots/slide-1-tip-off.png` through `web/screenshots/slide-6-last-two-minutes.png`.
  - `lk room list` after stopping the test worker, closing the player tab, and deleting the empty test room — empty table (0 active rooms).
  - Live session: `/player` POSTed `/api/token` successfully, connected to the LiveKit room, rendered slide 1 and the real agent caption. Typed `How do we stop LeBron?`; the real agent invoked `show_slide(s2_lebron)`, the player rendered slide 2, and its live caption/status updated. Agent evidence in `/tmp/opencode/chalk-task09-agent.log:227-234`, including `rpc_roundtrip` `seq=2`, `ok=true`, `applied=true`.
  - Mic: the embedded browser denied/unavailable microphone access. The page displayed `Microphone blocked or missing. Allow mic access and reload.` on the sheet, retained text questions, and showed no runtime error overlay.
  - Session end: stopping the agent moved the connected player to `The film session ended.`; screenshot captured. Restart obtained a new token and connected, but the worker was no longer available at first. After restarting a worker, the new room reached the active “Setting the board” state; the model greeted without issuing `show_slide`, so a fresh slide after restart was not demonstrated. The worker and player tab were then stopped and the room list was emptied.
  - Desktop/mobile layout inspected at 1280×800 and iPhone 12 Pro (390×844). The sheet scales to fit the portrait viewport; small text remains small in portrait.
- Screenshots: real player slide 2 desktop `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvf69t17-ad2efd1e.png`; real player slide 2 mobile `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvf6a81l-7a1cc0e5.png`; ended state `/home/sidvish/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-mvf6jjy4-4622a85e.png`; six lab slide captures are in `web/screenshots/`.
- Not done / not verified:
  - A physical microphone voice turn was not possible in the embedded browser; only the blocked/missing permission path and text submission were exercised.
  - The task’s debug-only no-model `debug_probe` could register in a real room, but the starter `session.start()` remained on “Opening film room…” because the debug worker does not publish the agent state required by the starter hook. The production-style realtime agent path was verified with a real slide RPC instead. No debug-probe slide screenshots were produced.
  - A page reload cannot rejoin the same player room with the current token flow: `/api/token` creates a new random room for every `role=player` request. Attribute seeding on connect/reconnect remains covered by the deck command tests, but same-room reload restoration was not demonstrated.
  - No product docs, source facts, or architecture contracts changed.
