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
