# 12 — Hardwood Broadcast frontend redesign

## Goal
Player, lobby and reusable slide primitives adopt the Hardwood Broadcast direction with large readable type, fixed-fit geometry, state-only voice chrome and spatial slide transitions, without changing agent, deck, fact, RPC or tool behavior.

## Context
- Design source: `docs/DESIGN-BRIEF.md`, ADR-027, `design/hardwood/`
- Interaction reference: a private reference demo in `docs/DESIGN-BRIEF.md#what-to-learn-from-the-reference-demo`
- Existing behavior: merged tasks 09-11
- User feedback: current fonts are too small; current UI fits poorly; remove visible speech captions and use Listening/Speaking state only; preserve the bottom text-entry removal; add a strong slide transition.
- The untracked main-workspace concepts are readable at `/home/sidvish/Documents/Work/Personal/synthio-take-home/design/hardwood/`. Do not copy concept cutouts without complete per-file attribution; use `design/players/` in the product.

## Scope
- Frontend and frontend assets only. Do not change agent prompts, tools, deck content, facts, token semantics, RPC payloads or overlay state.
- Rebuild lobby and `/player` around a fixed 16:9 hardwood stage with a stable top scoreboard and bottom rail. The stage geometry must not move when state or overlays change.
- Self-host the licensed Hardwood fonts and CC0 floor texture with attribution. Reuse licensed `design/players/` cutouts and current deck geometry.
- Increase title, point and label scales to the minimums in the design brief. Reduce copy density visually without deleting or rewriting deck content.
- Remove all visible user/agent transcript captions and the typed question UI. Preserve accessible mic/camera/end controls and state-only Listening/Thinking/Speaking feedback.
- Restyle all six slides, courts, markers, cutouts, facts, board highlights, play motion and callouts to the Hardwood system. Keep ids, data and behavior unchanged.
- Add directional horizontal slide push: forward enters from right, backward from left, 280-360ms, fixed scoreboard/rail. A new slide command during motion cancels the old transition and settles on the latest seq. Reduced motion swaps immediately.
- Reserve bounded camera-tile space for task 13 without implementing camera behavior here.
- Keep Photo credits visible and update attribution for newly tracked floor/font assets.

## Out of scope
- Head-coach link/briefing, camera publication, active-speaker routing, new agent tools, editable slide text, status metrics and E2E simulators.

## Acceptance checks
| Check | How to verify | Evidence required |
|---|---|---|
| Full frontend checks | `pnpm test`, lint, typecheck | exact output |
| Six slides | screenshot loop at 1920x1080 and 1280x720 | readable type, no clipping or overlap |
| Fit stability | compare stage/court bounds across every slide, long state labels and board overlays | equal geometry report |
| Thumbnail readability | render all slides at 25% | titles and primary points legible |
| Voice chrome | inspect welcome, listening, thinking, speaking and ended | no transcript/text input; clear state and controls |
| Tool visuals | live or deterministic highlight, play and callout states | screenshots and unchanged RPC test output |
| Transition | record forward, backward and rapid interrupted navigation | frame sequence/video; latest slide wins |
| Reduced motion | emulate reduced motion | immediate correct final slide |
| Responsive | 1280x800 and 390x844 | no hidden controls; bounded camera reserve |

## Checklist
- [x] Implemented
- [x] Tests, lint and typecheck pass
- [x] Six slides verified at required sizes
- [x] Motion and interruption checks pass
- [x] Asset credits updated
- [x] Screenshots/recording attached outside git
- [x] LEARNINGS and task report updated

## Report (executor fills)
- Files changed:
  - Tracked assets: `web/fonts/hardwood/*.woff2`, `web/public/hardwood/floor.jpg`, `web/public/hardwood/CREDITS.md`
  - Chrome: `web/app/hardwood-fonts.ts`, `web/styles/hardwood.css`, `web/components/hardwood/*`, `web/lib/slide-transition.ts`, `web/lib/slide-transition.test.ts`, `web/app/player/layout.tsx`, `web/app/coach/layout.tsx`, `web/app/lab/layout.tsx`
  - Surfaces: `web/components/deck/*` primitives + `SlideView.tsx`, `web/components/app/{app,view-controller,welcome-view}.tsx`, `web/app/{lab,coach}/**`, `web/lib/deck/credits.server.ts`
  - Checks: `web/scripts/{shoot,shoot-motion,test-caption-layout}.mjs`, `web/package.json`
  - Docs: `LEARNINGS.md`, `docs/plan/12-hardwood-frontend.md`
- Commands run and key output:
  - `pnpm test` — 9 files, 78 passed
  - `pnpm lint` — pass; only pre-existing agents-ui warnings
  - `pnpm exec tsc --noEmit` — pass
  - `python3 scripts/sync_deck.py --check` — `sync check passed`
  - `pnpm shoot` — 6 slides at 1920/1280/480, tool/state/responsive stills, contact sheet; geometry rows 6
  - `pnpm test:geometry` — stage 1920×1080 / 1280×720 / 390×219.375; camera yes; no captions or text input
  - `pnpm shoot:motion` — forward/backward/rapid/reduced passed (rAF transform samples + webm)
- Evidence paths (gitignored / tmp, not committed):
  - Stills: `web/screenshots/*.png` and `/tmp/task12-evidence/*.png`
  - 25% sheet: `/tmp/task12-evidence/contact-sheet-25pct.png`
  - Geometry: `/tmp/task12-evidence/geometry.json`
  - Motion frames: `/tmp/task12-evidence/push-{forward,backward,rapid,reduced}/`
  - Motion video: `/tmp/task12-evidence/push-{forward,backward,rapid,reduced}.webm`
- Asset credits:
  - Floor: Poly Haven “Laminate Floor 02”, CC0 → `web/public/hardwood/floor.jpg`
  - Fonts (OFL): Bebas Neue, Inter, IBM Plex Sans Condensed, Kalam, DSEG7/14 Classic in `web/fonts/hardwood/`
  - Cutouts: existing `design/players/` + `/lab/credits` (hardwood concept cutouts and JR image not copied)
- Not done / not verified:
  - Live `/player` stills (needs `LIVEKIT_URL`; lobby/ended captured via `/lab`)
  - JR local meme remains gitignored; fallback card verified
  - Did not merge
