# Credits

## Floor texture
- `assets/laminate_floor_02.jpg` (2K diffuse) — "Laminate Floor 02" by Poly Haven, https://polyhaven.com/a/laminate_floor_02 (file: dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/laminate_floor_02/laminate_floor_02_diff_2k.jpg). License: **CC0**.
- `assets/floor.jpg` is derived from it: tiled at 60%, warmed toward maple (R x1.12, B x0.82, saturation 0.9). A 32% dark overlay is added in CSS (`--floor-dim`).

## Fonts (self-hosted in `fonts/`)
- DSEG7 Classic Bold, DSEG14 Classic Bold — keshikan, https://github.com/keshikan/DSEG (npm `dseg@0.46.0`). SIL OFL 1.1.
- Bebas Neue — Dharma Type. SIL OFL 1.1 (via @fontsource).
- Inter 400/600/800 — Rasmus Andersson. SIL OFL 1.1 (via @fontsource).
- IBM Plex Sans Condensed 500/700 — IBM. SIL OFL 1.1 (via @fontsource).
- Kalam 700 — Indian Type Foundry. SIL OFL 1.1 (via @fontsource).

## Player cutouts
Copied from `/workspace/player-photos/cutouts/`. They come from Wikimedia Commons under CC BY-SA 2.0, CC BY-SA 4.0 or CC BY 2.0, with the background removed. The full author and source list for each file is in `/workspace/player-photos/CREDITS.md`. Any build that uses them must ship that attribution.

## JR card image (slide 6): cannot be licensed
`/workspace/chalk-talk/local-assets/lebron-jr-cutout.png` (a 2018 Finals broadcast frame) is referenced by absolute path, not copied. It is for local demos only. Never commit or deploy it. The public build must use the text-only fallback card.
