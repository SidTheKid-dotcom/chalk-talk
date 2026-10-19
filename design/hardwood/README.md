# Chalk Talk — "Hardwood court" mockups

Eight 1920x1080 PNGs: `slide-1..6.png`, `coach.png`, `lobby.png`, plus `overview.jpg` (contact sheet).
Source: `src/tokens.css` (all tokens and components), `src/build.py` (writes `pages/*.html`), `src/render.js` (Playwright, 1920x1080, DPR 1, waits for `document.fonts.ready`).
Rebuild: `python3 src/build.py && node src/render.js slide-1 slide-2 slide-3 slide-4 slide-5 slide-6 coach lobby`. Render the slides first, because coach.png embeds the slide PNGs.

## Tokens
| Token | Value | Use |
|---|---|---|
| --gsw | #1D428A | Warriors markers, lane paint, lower-third number tile |
| --gold | #FFC72C | Cut arrows, highlighter, kicker, primary buttons, Kalam callouts |
| --cle | #860038 (marker ring #C0144F for contrast on wood) | Cavs |
| --panel | #0B0B0C | Scoreboard, rail, LED panels |
| --card | rgba(14,14,16,.92) + 1px rgba(255,255,255,.10) | All text sits on these |
| --amber / --red | #FFB000 / #FF3B30 | LED digits (unlit segments drawn at 10% alpha behind) |
| --ink / -2 / -3 | #F4F1EA / #B9B4AA / #7E7A72 | Text |
| --floor-dim | .32 | Dark overlay on wood (coach view .55) |
| Ball ring | #FF7A1A | Ball handler |

Grid is 8px. Outer margin is 96px. Scoreboard is 64px at the top and the rail is 64px at the bottom. Title area starts at x=96. Left column runs 96–904 (808 wide). Court sits at 1064,128 and is 760x714 (15.2 px/ft, half court 50x47 ft, basket at top).

Type:
- Bebas Neue: titles 120px/0.9 uppercase (168px on tip-off), card heads 44px.
- Inter: 600 26px row heads, 400 19px body.
- IBM Plex Sans Condensed 700: tracked labels, 13–16px.
- DSEG7: scoreboard and shot clock.
- DSEG14: the ticker. Spaces are written as `!`, which is DSEG's full-width blank.
- Kalam 700: agent marker notes only.

## Components
- **Scoreboard bar** (`.sb`): brand, GSW 3 · SERIES 3-3 · GAME 7 · 3 CLE, slide n/6, red 24 shot clock. Never an in-game score.
- **Kicker + title**, **matte card** (`.card` with an `.hd` header and numbered `.row`s).
- **Court** (`court()` in build.py): white lines, blue lane, gold center circle.
  - GSW markers: solid blue circle with a white number.
  - CLE markers: black circle with a wine ring and a white number.
  - Surname labels go on the side the slide is about.
  - Ghost: a 35% dashed outline showing the previous position in a play step.
- **Notation**: cut/movement = gold dashed line with arrowhead; pass = white dotted; screen = short white bar perpendicular to the cutter; ball = orange ring. A legend chip sits under every court. Team colours stay fixed (GSW is always the blue circles) instead of switching O/X between offence and defence, so viewers can track teams across slides.
- **Lower third** (`.l3`): number tile in team colour with a 4px accent underline, plus a black name plate.
- **Tool effects**:
  - `highlight`: gold highlighter swipe behind the marker (slide 3).
  - `run_play`: mid-step, with ghosts, trails and a step caption (slides 2 and 4).
  - `add_callout`: Kalam note with a small "Coach note" chip (slide 2).
  - `highlight(k_jr_card)`: JR card revealed (slide 6).
- **Rail**: agent status pill (speaking = gold with level bars; listening = outlined with a red dot), DSEG14 ticker "GAME 7 · TOPIC · n/6", hint text, mic button.

## Builder notes
- The shot clock is static here. Live, it counts down from 24 while the agent speaks and resets each turn. The status pill and level bars follow turn state.
- The highlighter should wipe left to right (~250ms). Play arrows draw stroke by stroke and markers tween along the path. Ghosts show the previous step.
- Keep all text on cards or the dark bars. Only short tracked labels sit directly on the wood, with a subtle dark stroke.
- Facts used: F08 (series 3-3, Game 7 at Golden State) and the W/L pips derived from F02–F07. "Oracle Arena", "June 18, 2016" (the night before the June 19 Game 7) and the jersey numbers are not in FACTS.md. Add rows for them or remove them.
- The JR image is local-only (see CREDITS.md). `build.py` falls back to a text-only card if the file is missing.
- Bogut is not used (he was injured for Games 6 and 7).
