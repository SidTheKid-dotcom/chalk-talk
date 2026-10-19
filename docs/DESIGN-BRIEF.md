# Chalk Talk — design brief

Status: decided. Direction: **Hardwood Broadcast**.
This file is the source of truth for frontend appearance and motion. `docs/PRODUCT.md` and `docs/ARCHITECTURE.md` continue to own behavior and contracts. The prior Scouting Packet direction is archived in `docs/DESIGN-BRIEF-SCOUTING-PACKET.md`.

## The idea
The film session happens directly on a dimmed hardwood court, framed by a broadcast scoreboard and a narrow arena rail. Slides are not paper documents floating on a desk. The court is the canvas. High-contrast matte panels hold copy; diagrams, player cutouts and coaching marks live on the wood.

Reference implementation and visual target: `design/hardwood/`. It is a concept source, not a content source. Copy, facts, ids, play geometry and licensed player assets still come from deck data, `FACTS.md` and `design/players/`.

## Interaction lessons from voice-slide demos
A good voice-driven deck:
- Keeps one stable, centered 16:9 slide canvas instead of allowing content to resize the application frame.
- Uses a strong headline and few large content groups. It is readable before the narration explains it.
- Keeps voice chrome minimal: a human camera bubble, one listening/speaking state and one mic control. It does not mirror user or agent speech as captions.
- Uses a quick horizontal push between slides. The outgoing slide exits left while the incoming slide enters from the right, so navigation feels spatial rather than like a page refresh.
- Uses restrained progressive emphasis to show what changed without rebuilding the whole screen.

## Design DNA
1. **One physical metaphor:** arena hardwood plus broadcast graphics.
2. **Fixed stage:** all slides fit one 16:9 viewport. Content never changes the stage width or height.
3. **Large type first:** a slide must read in a video-call tile before details are added.
4. **High contrast:** key text always sits on a dark matte panel or uses large off-white display type over dimmed wood.
5. **Sparse hierarchy:** one headline, one primary panel, one court or player composition. Avoid many small notes.
6. **State, not transcript:** show Listening, Thinking or Speaking. Do not show live user or agent captions on player or coach screens.
7. **Motion with direction:** slide navigation is a short horizontal push; board actions draw, move, highlight or settle in place.
8. **Humans are present:** player and coach camera tiles are part of the session chrome, with a clear active-speaker treatment.
9. **Honest values:** only sourced facts and measured metrics. Unknown values show `—` or are omitted.
10. **Accessible controls:** 44px minimum targets, visible focus, camera-off and mic-off fallbacks, reduced-motion support.

## Palette
| Token | Value | Use |
|---|---|---|
| hardwood | licensed CC0 floor texture, warm maple treatment | full stage |
| panel | `#0B0B0C` | scoreboard, content panels, rail |
| panel-line | `rgba(255,255,255,.10)` | quiet panel separation |
| ink | `#F4F1EA` | primary text and court lines |
| ink-2 | `#B9B4AA` | secondary copy |
| ink-3 | `#7E7A72` | tertiary labels only |
| blue | `#1D428A` | Warriors, lane paint, structural accents |
| gold | `#FFC72C` | active emphasis, play movement, primary control |
| wine | `#860038` | Cavaliers |
| orange | `#FF7A1A` | ball-handler ring only |
| red | `#FF3B30` | live/listening dot and interruption only |

The wood receives a dark overlay so white court lines and text stay legible. Semantic team colors remain stable across offense and defense.

## Typography
Self-host only licensed fonts already documented by `design/hardwood/CREDITS.md`.

| Font | Job |
|---|---|
| Bebas Neue | slide titles, score labels, major actions |
| Inter 400/600/800 | body copy and readable coaching points |
| IBM Plex Sans Condensed 500/700 | tracked labels, metadata, controls |
| DSEG7 / DSEG14 | small scoreboard and rail displays only |
| Kalam 700 | agent-added coach notes only |

Minimum target sizes on the 1920x1080 stage:
- Slide title: 104-144px, tight leading.
- Primary point heading: 26-32px.
- Point detail: 21-24px, line-height at least 1.35.
- Labels: 14-16px with tracking.
- Status controls: 15-18px.

Never shrink body copy to make more content fit. Shorten or regroup the presentation instead.

## Stage anatomy
- **Top scoreboard, 64px:** Chalk Talk, series tied 3-3, Game 7, slide n/6. Do not show an invented game score, date, arena, shot clock or jersey number unless sourced.
- **Main stage:** 96px outer margins. Left content zone and right court/player zone are explicit grid tracks with `min-width: 0`; dynamic UI cannot change them.
- **Headline:** upper left, usually two lines maximum.
- **Matte panel:** one main explanation block. Rows are numbered or lettered and use large copy.
- **Court:** right side, regulation half-court proportions from deck geometry. White lines, blue paint, fixed team markers and a small legend.
- **Cutouts:** licensed `design/players/` images only. Use broadcast lower thirds and strong silhouette scale. Never take names or facts from concept images.
- **Bottom rail, 64px:** state pill, slide/topic indicator, camera/mic controls and coach status. No transcript or text-entry field.

## Voice and camera chrome
- Never render user or agent speech captions on `/player` or `/coach`.
- Show only `Listening`, `Thinking`, `Speaking`, `Waiting` or `Disconnected` with a restrained dot or level animation.
- Player and coach camera tiles show name/role, camera-off fallback and active-speaker border. The AI is audio-only and has no fake avatar.
- Keep camera tiles outside the main slide grid or in a bounded overlay that never changes slide geometry.
- The player view has compact mic, camera and end-session controls. There is no typed question bar.

## Slide layouts
- **Slide 1:** one oversized statement, three large keys in one panel, a Warriors vs Cavaliers matchup card under it, and both-team lineups (five equal columns per team) centered on the right. The board stays blank until they ask for the plan.
- **Attack zones:** a diagram may map a player to the zone he attacks from (`attack_zones`). Highlighting that player also shades the zone with an "Attacks from" label.
- **Slides 2-4:** headline and coaching-point panel left; large court right; at most one cutout/lower-third group and one board-action caption.
- **Slide 5:** four swing-factor columns or a strong asymmetric grid with 24px+ body text. Avoid tiny card copy.
- **Slide 6:** head-coach call panel left, optional local-only JR card center, blank zone-labelled court right.

## Board tools
- `highlight`: gold swipe or ring around an existing marker, zone, card or approved text group. It never rewrites copy.
- `run_play`: markers tween, uninvolved players dim, gold movement arrows draw, pass and screen notation stay distinct, one large current-step caption appears. The legend shows only while a play is on.
- `add_callout`: Kalam note plus a small Coach note label, or a verified fact card. It never edits the static title or coaching points.
- Static slide content is immutable during a session. The model may only select slides and approved overlay tools.

## Slide transitions
- Navigation uses a 280-360ms horizontal push inside a clipped stage.
- Forward: outgoing slide moves left and fades slightly; incoming slide enters from the right.
- Backward: reverse the direction.
- Use `transform` and `opacity` only. The scoreboard, bottom rail and human video remain fixed.
- A new voice interruption cancels the current transition and settles immediately on the requested slide.
- `prefers-reduced-motion` swaps slides without motion.
- Board animations do not rerun merely because a participant attribute echoes or a view reconnects.

## Coach view
The coach page uses the same visual system, not a separate paper theme.

Desktop:
- Live slide preview occupies the left two-thirds.
- Private briefing and current context occupy the right third.
- Camera rail and active-speaker state remain visible.
- No transcript panel.

Phone portrait:
- Compact top scoreboard and private label.
- Two small human video tiles or fallbacks.
- Current slide thumbnail.
- Briefing fields: Brief (summary), Main worry, Topics, Now on. No raw transcript dump.
- Large mic/camera controls and a clear take-floor state.
- No dense slide carousel and no tiny transcript table.

## Lobby
- Hardwood court background and one centered matte join panel.
- Large Chalk Talk title and one-line product explanation.
- Camera/mic preview or explicit off state.
- One primary Join film session action.
- No fake scoreboard values and no required name field unless identity naming is implemented.

## Motion and fit verification
- Verify every slide at 1920x1080, 1280x720, 1280x800 and 390x844.
- The stage bounding box, court edge and content tracks must not move when state, camera, controls or board overlays change.
- Record forward, backward and interruption transitions.
- Verify titles and primary points in a 25% thumbnail.
- Verify no text below the minimum scale, no clipped controls and no overlap with camera tiles.

## Asset and content rules
- Floor texture must be CC0 and credited.
- Player cutouts must come from `design/players/` with their existing attribution. Do not commit the duplicate `design/hardwood/assets/cutouts/` set until every file has a complete credits row.
- The JR broadcast image remains local-only and gitignored; public builds use the text fallback.
- Draw court geometry, markers and plays from deck data. Never trace concept-image errors.
- Every factual claim still comes from `FACTS.md`; the redesign changes no agent, deck or tool contract.

## Do not
- No visible live transcript or speech captions.
- No typed question bar in the live session.
- No paper sheet, paperclip, manila desk or scrapbook chrome in the new direction.
- No glassmorphism, purple AI gradients, decorative team colors or generic dashboard cards.
- No unsourced date, arena, jersey number, game score or shot-clock claim.
- No arbitrary model-authored text, layout or play geometry.
