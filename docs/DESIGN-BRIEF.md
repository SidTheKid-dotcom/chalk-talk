# Chalk Talk — design brief

Status: decided. Direction: **Scouting Packet**.
This file is the source of truth for the UI look. `docs/PRODUCT.md` and `docs/ARCHITECTURE.md` own behavior and contracts.

Rejected alternative: "Film Room Slate" (a dark chalkboard look).

## The idea
A printed scouting report on a manila desk, with TV broadcast lower-thirds.
The deck is a sheet of paper. The assistant coach marks it up live with blue ink, a gold highlighter and a marker pen.
Put this one line at the top of the main stylesheet:
`/* Chalk Talk: one scouting sheet on a manila desk. Blue ink, gold highlighter, rust stamps. */`

## Design DNA
1. **One physical metaphor.** The scouting packet. Every element is paper, ink, highlighter, stamp, clip, tape or marker. Player photos are paper cutouts taped or clipped to the sheet.
2. **Warm tinted neutrals.** Never pure black. Never pure white. Accents are semantic. No decorative gradients.
3. **Four fonts, each with one job.** See "Type".
4. **Hand-drawn, stable strokes.** Use seeded rough.js-style SVG strokes (`roughLine`, `arrow`, `smoothPath` with a fixed seed). A stroke looks hand-drawn. It does not change between renders.
5. **Texture in code.** Paper grain and fibres come from canvas or SVG noise. No stock images. Rotations stay under 1° (player cutouts may tilt up to about 4°).
6. **Motion is drawing and placing.** Strokes draw on. Stamps press in. Cards settle. Each screen has one big moment only.
7. **Honesty.** Show only measured values. Show "—" for an unknown value. Never invent a number.
8. **Plain copy.** Sentence case. No hype. No emoji.
9. **Craft.** Tap targets are 44px minimum. Focus rings are visible. Big numbers use tabular figures.
10. **Easing.** Use `cubic-bezier(.22,1,.36,1)` for all motion.

## Palette

| Token | Hex | Meaning and use |
|---|---|---|
| manila | `#EADFC4` | The desk. Page background. |
| sheet | `#F6F1E4` | The report sheet. Slide surface and cards. |
| ink | `#191714` | Primary text. Status strip background. |
| ink-2 | `#57514A` | Secondary text only. Never key text. |
| blue | `#1D428A` | Ours and structure: court lines, Warriors markers, lower-third bar, checkboxes, ink arrows. |
| gold | `#FFC72C` | Highlighter. `mix-blend-mode: multiply`. Means "look here". |
| wine | `#860038` | Them: Cavs marker outlines and labels. |
| rust | `#A23B1F` | Stamps and interruptions. |

Rules:
- **Gold = "look here".** Use it only for the active highlight.
- **Wine = them.** Use it only for the opponent.
- **Blue = ours and structure.**
- **Private to the coach** uses a blue pill (sheet text on blue, fully rounded). Use this pill only for coach-private items.
- **Rust = stamps and interruptions.**
- Never use a semantic color as decoration.

## Type
All fonts are free on Google Fonts.

| Font | Job |
|---|---|
| Fraunces 800 | Slide titles and the briefing title. Tight leading (about 1.05). |
| Archivo (condensed widths) | Broadcast lower-thirds, counters, labels, status strip, big numbers. |
| Courier Prime | Body text: slide points, card text, briefing fields. |
| Kalam | Only the marker notes the agent draws (`add_callout`). Never for UI text. |

The live transcript caption uses Fraunces italic (a serif italic).

## Slide anatomy (1920×1080)
- The **sheet** sits on the manila desk, rotated under 1°, with a soft layered shadow.
- **Lower-third bar**, top left: a blue band with a short gold tick. It carries `NN / 06 · section` in Archivo, for example `02 / 06 · Scouting report`.
- **Headline:** Fraunces 800, large, left aligned, sentence case.
- **Points:** up to 3, Courier Prime. Each has a blue hand-drawn checkbox or a blue numeral.
- **Court**, right side: a top-down half court in blue ink, lines at least 2px.
- **Markers:** Cavs = sheet fill with a wine outline and wine surname. Warriors = solid blue fill with sheet surname. The label is the surname only.
- **Highlight:** a gold highlighter swipe behind the target.
- **Marker note:** Kalam text in blue, placed by `add_callout`.
- **Note card:** a small sheet card held by a paperclip. An Archivo label plus 1–2 lines of Courier Prime.
- **Stamp:** "GAME 7" in rust, top right, uneven ink (radial mask), slightly rotated, multiply.
- **Caption:** one line, serif italic. It is the live transcript line of the agent's speech.
- **Status strip:** a dark ink bar at the bottom. It holds the state pill (Listening, Thinking, Speaking), `turn NN`, `latency — ms`, `interruptions N`, and coach status (for example "Coach connected"). Values are measured or "—".

## Player cutouts
Real players appear only as licensed Wikimedia Commons photos from `design/players/`. The files are plain transparent PNG cutouts. Credits for every file are in `design/players/CREDITS.md`.

How a cutout renders:
- A thick off-white paper border (`#F6F1E4`, about 14px) follows the silhouette, like a photo cut out with scissors.
- A soft drop shadow, the same warm shadow as the sheet.
- A slight rotation, at most about 4°, seeded so it does not change between renders.
- Held by a strip of tape or a paperclip.
- A typewriter caption below on a small sheet label: Courier Prime caps, name plus team, for example `STEPHEN CURRY · GSW`.

Rules:
- Court diagrams still use circular markers with surname labels. Cutouts never replace markers and never sit on the court. They sit beside the court or in a matchup strip.
- No logos or wordmarks are drawn by us. Only what is already in the licensed photo appears.
- Credits must be visible: a small "Photo credits" link in the UI opens the list from `design/players/CREDITS.md`.
- A missing cutout file renders as the caption label alone. Never a broken image.

Which cutout appears where (players from `docs/PRODUCT.md#slides` and `FACTS.md`):
| Slide | Cutouts | Placement |
|---|---|---|
| 1 Tip-off | Lineup strip: Curry, K. Thompson, Green, Iguodala, Barnes vs James, Irving, Love, Smith, T. Thompson | A "Warriors vs Cavs" strip along the bottom of the sheet |
| 2 Stop LeBron | `lebron-james.png` | Taped beside the court, left of the points |
| 3 Kyrie iso | `kyrie-irving.png` | Taped beside the court |
| 4 Our offense | `stephen-curry.png`, `draymond-green.png` (optional `klay-thompson.png`) | Matchup strip beside the court |
| 5 X-factors | `kevin-love.png`; bench strip may use `shaun-livingston.png`, `andre-iguodala.png`, `festus-ezeli.png` | Beside the text strip |
| 6 Last two minutes | The JR card (see below) | Pinned to the sheet, hidden until revealed |

`andrew-bogut.png` is kept for completeness but is not placed on any slide. He missed Games 6 and 7 of the 2016 Finals through injury.

## Slide 6: the JR card
A small joke card for the last two minutes. The joke is that it comes from the future of this 2016 film room.
- Image: `local-assets/lebron-jr-cutout.png` (or `local-assets/lebron-jr.jpg`), LeBron with arms spread at J.R. Smith, 2018 Finals Game 1. It is a broadcast frame and cannot be licensed, so it lives only in the gitignored `local-assets/` folder. The app loads it from that local path at dev and demo time. It is never committed and never deployed in the public build.
- Look: the cutout pinned to the sheet with a strip of tape, paper border and soft shadow like the player cutouts.
- Caption: Kalam marker in blue, `Know the score. Don't be JR.`
- Tiny typewriter note below it in Courier Prime, ink-2: `see: 2018`.
- Hidden by default. It is a pre-placed slide 6 element revealed by `highlight(k_jr_card)` (see `docs/ARCHITECTURE.md#deck-data-additions`). It "settles" onto the sheet like a note card.
- Fallback: if the image file is missing, the card is a text-only paper card with the same caption and note. The tool still acks.
- It never shows or hints at the 2016 Game 7 result.

## How board tools render
- `highlight(target)`: a gold highlighter swipe. It animates left to right behind the marker or across the zone. For the card target `k_jr_card`, the hidden JR card settles onto the sheet instead.
- `run_play(play_id)`: arrows draw in blue ink, stroke by stroke, in play order. Markers move along the drawn paths. Use coaching notation: solid curve = cut, dashed = pass, zigzag = dribble, short T-bar = screen.
- `add_callout(fact_id | text)`: a Kalam marker note, written on the sheet. A fact callout uses the paperclipped note card.
- Limits follow `docs/PRODUCT.md`: at most 2 highlights and 3 callouts at once. Prefer 2 callouts.
- All overlays clear on slide change.

## Coach phone view (390×844, portrait)
- Top: a blue bar with `Head coach · private`.
- Under it: the live slide line, for example `Live · Slide 3 / 6 · Kyrie in isolation`.
- A small thumbnail of the current slide.
- The **briefing sheet**: a sheet card held by a binder clip, with a rust "BRIEFING" stamp. Three fields, each with an Archivo label:
  - **They asked**
  - **Main worry** (gold highlighter on the label)
  - **Now on**
- A full-width blue button: **Hold to take the floor**. At least 44px tall.
- A text link: **Jump to slide N**.
- Bottom: one status line (state · latency — ms · interruptions N).
- Portrait only. The coach view is never landscape.

## Video-call and projector legibility
- Key text is ink `#191714` on sheet `#F6F1E4`.
- Blue lines are at least 2px at 1080p.
- The highlighter is at full saturation.
- Do not use low-contrast greys for key text. ink-2 is for secondary text only.
- Check every screen at 1920×1080 and in a shrunk video-call tile.

## Motion
- Slide transition: 240ms, fade plus a small rise. No 3D flips.
- Strokes draw on with `stroke-dashoffset`. Stamps press in. Cards settle.
- One master GSAP timeline per slide. Board tool calls map to timeline labels.
- Barge-in freezes all motion within one frame.
- Animate transforms and opacity only.
- No bounce. No elastic easing.
- `prefers-reduced-motion` shows the final state at once.

## Do not
- No logos or team wordmarks drawn by us. Team marks appear only where they are already in a licensed player photo.
- No player photos except the licensed cutouts in `design/players/`. No arena images. No photos from Getty, AP, NBA.com or news sites.
- No invented stats. Use measured values or "—", including latency.
- No purple gradients, no glassmorphism, no neon "AI" glow, no emoji.
- No Kalam for UI text. Kalam is only for the agent's marker notes.
- No cards inside cards. No icon-card grids.
- At most 3 callouts per slide. Prefer 2.
- Semantic colors are never decorative.

## Concept images
Player preview: `design/players/preview.jpg` shows all cutouts with the paper border, shadow and captions. It is a reference composite; the app draws these effects in code.

Files in `design/concepts/`:
- `slide-1-tip-off.jpg`
- `slide-2-stop-lebron.jpg`
- `slide-3-kyrie-iso.jpg`
- `slide-4-our-offense.jpg`
- `slide-5-x-factors.jpg`
- `slide-6-last-two-minutes.jpg`
- `coach-view.jpg`

Concepts guide look and feel only. They are generated images and they contain glitches. Known glitches:
- A stray `#FFC72C` label in the lower-third bar on slides 2–5.
- Garbled names in the play on slide 4.
- "Timers" instead of "Timeouts" on slide 6.
- A stray icon in a marker on slide 2.
- Court geometry is not exact.
- The coach view is rendered landscape. It must be portrait (390×844).

Rules:
- Draw courts, markers and plays in code from the deck data.
- Take player names and facts from `FACTS.md` and the deck data. Never take them from the images.
- Copy text from the deck data, not from the images.

## References
`design/refs/` holds screenshots of the author's own prior projects, Vachan and MoolTrace. They show the target taste: paper, ink, stamps, highlighter, semantic color, honest unknowns.

## Workflow
1. Build the primitives in a `/lab` route first: sheet, lower-third, court, marker, rough stroke and arrow, highlighter swipe, stamp, note card, Kalam note, caption, status strip, briefing sheet. Drive them from JSON.
2. Run a Playwright screenshot loop at 1920×1080 (slides) and 390×844 (coach). Put each shot next to its concept image. Fix and shoot again.
3. Add one GSAP timeline per slide. Test barge-in freeze and reduced motion.
