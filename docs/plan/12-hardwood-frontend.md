# 12 — Hardwood Broadcast frontend redesign

## Goal
Player, lobby and reusable slide primitives adopt the Hardwood Broadcast direction with large readable type, fixed-fit geometry, state-only voice chrome and spatial slide transitions, without changing agent, deck, fact, RPC or tool behavior.

## Context
- Design source: `docs/DESIGN-BRIEF.md`, ADR-027, `design/hardwood/`
- Interaction reference: `docs/DESIGN-BRIEF.md#interaction-lessons-from-voice-slide-demos`
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
- [ ] Implemented
- [ ] Tests, lint and typecheck pass
- [ ] Six slides verified at required sizes
- [ ] Motion and interruption checks pass
- [ ] Asset credits updated
- [ ] Screenshots/recording attached outside git
- [ ] LEARNINGS and task report updated

## Report (executor fills)
- Files changed:
- Commands run and key output:
- Evidence paths:
- Not done / not verified:

## Round 2 (planner, from audit 12)
Fix on branch `t3/hardwood-frontend-redesign`. Do not change agent, deck, facts, RPC or hooks.
1. **Slide 5 photo pairing (blocker).** `SlideView.tsx` `FactorsGrid` pairs `slide.cutouts[index]` with points and puts `cutouts[3]` on the fact column. Deck data has no point-to-player link, so this puts Livingston on "Green is back" and Ezeli on F15 (Green). Remove positional pairing: render the cutouts as a captioned photo strip separate from the text columns. Do not add a frontend point-to-player map (it would invent data).
2. **Push transition collides (blocker).** `hardwood.css` outgoing layer moves only -12% at opacity .85 and `.slide-layer` is transparent, so headlines overprint at the midpoint. Make a true push: outgoing to `translateX(-100%)` (forward) / `+100%` (backward), incoming from the opposite side, stage `overflow:hidden`; optionally fade outgoing to 0 by ~40%. Add a check that pauses the animations mid-way (`document.getAnimations()`, set `currentTime` to 50%) and asserts the outgoing and incoming headline boxes do not intersect, forward and backward.
3. **Play overlaps (blocker).** The LeBron cutout (`z-[2]`) covers `.play-caption`. Hide the cutout while a play runs, and give the caption `z-index:3` (or move it to the court's top-left). Draw ghost markers without labels at lower opacity. Apply the collision offset to every play step's positions. Extend `scripts/test-caption-layout.mjs` (or the marker overlap test) to check every play step, ghosts included. Caption label "Play", not `run_play`.
4. **Controls below 44px (blocker).** `SessionControls` render inside the scaled stage. Render them in an unscaled bar outside `ScaledSlide` that overlays the rail area; same for the Photo credits link. Assert at 1920×1080, 1280×800 and 844×390: each control ≥44px tall, credits link readable (≥14px text).
5. **Portrait phone.** No reflow. Below 600px portrait: stage pinned top at full width, unscaled controls below, and a small "Rotate your phone or open on a laptop" hint. Screenshot 390×844 and 844×390.
6. **Nits.** Add `web/fonts/hardwood/OFL.txt` (font license text). `aria-pressed` on the mic toggle.

Evidence: `pnpm test && pnpm lint && pnpm exec tsc --noEmit`; `python3 scripts/sync_deck.py --check`; mid-transition frames forward and backward; screenshots of slide 5, play step 2 and 4 on slide 2, controls at three viewports, portrait phone.
