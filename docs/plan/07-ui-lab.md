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
- [x] Implemented
- [x] Lint and typecheck pass
- [x] Tests pass (list)
- [x] Acceptance checks pass with evidence
- [x] Screenshots attached (UI tasks)
- [x] LEARNINGS.md updated (if any surprise)
- [x] Docs updated (README / DECISIONS / FACTS) if affected

## Report (executor fills)

### Round 2
Planner review: court labels collided, court too small, captions clipped, status "tum", wrong fact card, lower-third all caps, coach stamp over title.
- Featured fact: optional `featured_fact_id` (s1 F08, s2 F07, s3 F16, s4 F11, s5 F15, s6 F08)
- Markers: surname inside the ring, ~43px radius at 1920, defender offset toward the rim; Vitest overlap test
- Sheet: court ~50–55% right, cutouts at the court edge, lineup/x-factor cutouts larger
- Status: tracking 0 so "turn" reads, state pill "—", "Coach —"
- Lower-third sentence case; coach stamp at the clip; thumbnail 60%

- Files changed:
  - `web/app/lab/layout.tsx`, `web/app/lab/page.tsx`, `web/app/lab/credits/page.tsx`
  - `web/components/deck/*` (sheet, court, markers, cutouts, cards, briefing, gallery)
  - `web/lib/deck/{types,load,credits,credits.server,plays,index}.ts`
  - `web/lib/sketch/{rough,court}.ts`
  - `web/styles/scouting.css`, `web/styles/globals.css` (required brief comment)
  - `web/scripts/sync-players.mjs`, `web/scripts/shoot.mjs`
  - `web/package.json`, `web/pnpm-lock.yaml` (Playwright), `web/.gitignore`, `web/.prettierignore`
  - `LEARNINGS.md`, `docs/plan/07-ui-lab.md`
- Commands run and key output:
  - `node scripts/sync-players.mjs` → 14 player files + local meme copied
  - `pnpm lint` → pass (2 pre-existing starter warnings)
  - `pnpm exec tsc --noEmit` → pass
  - `LAB_URL=http://127.0.0.1:3001 node scripts/shoot.mjs` → 10 screenshots
  - `git ls-files | grep -i jr` → `design/players/jr-smith.png` only
  - grep of `web/components/deck` and `web/app/lab` for player names → no names except the brief's "Warriors vs Cavs" strip label
- Not done / not verified:
  - Shrunk video-call tile (only 1920×1080 and 390×844)
  - GSAP master timeline / barge-in freeze (CSS only; later task)
  - True scissors-cut silhouette border (CSS drop-shadow rings)
  - README / DECISIONS / FACTS unchanged

### Asset choice
Copy script `web/scripts/sync-players.mjs` on `predev`/`prebuild`, not a committed duplicate. `design/players/` stays the license source. `web/public/players/` and `web/public/local/` are gitignored. `--check` compares filenames.

### Semantic colors
| Token | Where used |
|---|---|
| manila | Desk / page background |
| sheet | Slide surface, note cards, cutout captions, CLE marker fill |
| ink | Primary text, status strip |
| ink-2 | Photo credits, JR "see: 2018", secondary labels |
| blue | Court, GSW markers, lower-third, checkboxes, arrows, hold button, coach pill |
| gold | Highlighter, lower-third tick, Main worry, state-pill ring |
| wine | CLE marker outline and labels only |
| rust | GAME 7 and BRIEFING stamps |

### Screenshots
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/slide-1-tip-off.png`
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/slide-2-stop-lebron.png`
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/slide-3-kyrie-iso.png`
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/slide-4-our-offense.png`
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/slide-5-x-factors.png`
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/slide-6-last-two-minutes.png`
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/coach-view.png`
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/fallback-cutout.png`
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/fallback-jr.png`
- `/home/sidvish/.t3/worktrees/synthio-take-home/t3-0d079a4f/web/screenshots/reduced-motion.png`
