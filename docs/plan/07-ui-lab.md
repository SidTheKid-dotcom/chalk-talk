# 07 — UI primitives in /lab (Scouting Packet)

## Goal
A `/lab` route renders every Scouting Packet primitive from deck JSON, and screenshots at 1920×1080 and 390×844 match the design brief.

## Context
- Design: `docs/DESIGN-BRIEF.md` (read all of it), `design/concepts/*.jpg` (look only; known glitches listed in the brief), `design/refs/`, `design/players/` + `CREDITS.md`
- Data: `web/lib/deck/deck.json`, `web/lib/deck/facts.json` (from task 02)
- Decision: ADR-015, ADR-018
- Depends on: 01, 02.

## Scope
- Primitives, each a component driven by props from deck data: sheet on manila desk, lower-third bar, headline, points with hand-drawn checkboxes, half court (blue ink, from deck geometry), markers (GSW / CLE styles), seeded rough stroke + arrow (cut, pass, dribble, screen), gold highlighter swipe, rust GAME 7 stamp, note card with paperclip (fact card: claim verbatim + id + source domain; text card: "Coach's note"), Kalam marker note, serif-italic caption line, status strip (values "—" when unknown), player cutout (paper border, shadow, seeded tilt, caption label, missing-file fallback), JR card (local image if present, text fallback otherwise), "Photo credits" link listing `CREDITS.md`, coach briefing sheet (portrait).
- Fonts: Fraunces, Archivo, Courier Prime, Kalam via `next/font/google`.
- `/lab` page shows all six slides statically (no overlays) and a primitives gallery. A `?slide=s2_lebron&highlight=cle_james` query preview is enough for overlays.
- Motion: one demo of stroke draw-on and highlighter swipe; `prefers-reduced-motion` shows final state. GSAP only if needed now; else CSS.
- Playwright screenshot script: `web/scripts/shoot.mjs` → `web/screenshots/` (gitignored) at 1920×1080 per slide and 390×844 coach.
- `local-assets/` image path: `/home/sidvish/Documents/Work/Personal/synthio-take-home/local-assets/` exists only on the main checkout. Serve it in dev only through a gitignored symlink or copy into `web/public/local/` (gitignored). Never commit it.

## Out of scope
- RPC, LiveKit, real overlay state, play animation sequencing (later task).

## Acceptance checks (each needs evidence)
| Check | How to verify | Evidence required |
|---|---|---|
| All six slides render from data | `/lab` | 6 screenshots at 1920×1080 |
| Coach briefing view portrait | `/lab?view=coach` | screenshot 390×844 |
| Semantic colors only | review vs brief palette rules | short list per color where used |
| No text from images | grep components for player names/facts not from deck | grep output |
| Missing cutout and missing JR image fall back | rename locally, reload | 2 screenshots |
| Reduced motion | emulate in Playwright | screenshot |
| Lint, typecheck | `pnpm lint && pnpm exec tsc --noEmit` | output |
| Meme not committed | `git ls-files | grep -i jr` | output (only the licensed `jr-smith.png`) |

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
