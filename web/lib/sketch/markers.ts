import type { Coord, DeckPlayer, PlayStart, PlayerId, SlideDiagram } from '@/lib/deck/types';
import { toSvgPoint } from '@/lib/sketch/court';

/** /lab screenshot viewport. Padding must match SlideView + scouting.css. */
export const LAB_VIEWPORT = { width: 1920, height: 1080 } as const;
export const LAB_DESK_PAD_X = 40;
export const LAB_SHEET_PAD_X = 40;
export const COURT_WIDTH_FRAC = 0.55;
export const COURT_VIEWBOX_WIDTH = 104;
export const MARKER_RADIUS_PX = 43;
export const LABEL_OVERLAP_TOLERANCE_PX = 8;
export const RIM_DECK: Coord = [50, 5];
export const DEFAULT_MARKER_RADIUS_SVG = 4.8;

export type LabelBox = { x: number; y: number; w: number; h: number };

export type MarkerLayout = {
  id: PlayerId;
  svg: Coord;
  radiusSvg: number;
  label: string;
  fontSizeSvg: number;
  box: LabelBox;
};

export function labCourtWidthPx(viewportWidth = LAB_VIEWPORT.width): number {
  return (viewportWidth - 2 * LAB_DESK_PAD_X - 2 * LAB_SHEET_PAD_X) * COURT_WIDTH_FRAC;
}

export function svgUnitPx(courtWidthPx: number): number {
  return courtWidthPx / COURT_VIEWBOX_WIDTH;
}

export function markerRadiusSvg(courtWidthPx: number): number {
  return MARKER_RADIUS_PX / svgUnitPx(courtWidthPx);
}

/** Condensed Archivo caps — conservative average advance. */
export function estimateLabelWidthPx(label: string, fontSizePx: number): number {
  return label.length * fontSizePx * 0.56;
}

/** "K. Thompson" → ["K.", "THOMPSON"] so the surname can sit larger inside the ring. */
export function markerLines(label: string): string[] {
  const match = label.match(/^(\S+\.)\s+(.+)$/);
  return match ? [match[1], match[2]] : [label];
}

export function markerFontSizePx(label: string, radiusPx: number): number {
  const lines = markerLines(label);
  const longest = lines.reduce((best, line) => (line.length > best.length ? line : best), '');
  const maxWidth = radiusPx * 1.7;
  const maxHeight = radiusPx * 1.45;
  for (const size of [13, 12, 11, 10, 9, 8, 7.5, 7]) {
    const width = estimateLabelWidthPx(longest, size);
    const height = size * 1.1 * lines.length;
    if (width <= maxWidth && height <= maxHeight) return size;
  }
  return 6.5;
}

export function labelBoxAt(
  cxPx: number,
  cyPx: number,
  label: string,
  fontSizePx: number
): LabelBox {
  const lines = markerLines(label);
  const w = Math.max(...lines.map((line) => estimateLabelWidthPx(line, fontSizePx)));
  const h = fontSizePx * 1.15 * lines.length;
  return { x: cxPx - w / 2, y: cyPx - h / 2, w, h };
}

/** Smallest axis of the intersection rectangle; 0 if the boxes miss. */
export function boxOverlapPx(a: LabelBox, b: LabelBox): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  return Math.min(w, h);
}

export function formationMarkers(
  diagram: SlideDiagram,
  start?: PlayStart
): Partial<Record<PlayerId, Coord>> {
  return { ...diagram.markers, ...start?.positions };
}

type LayoutArgs = {
  markers: Partial<Record<PlayerId, Coord>>;
  players: Record<string, DeckPlayer>;
  matchups?: Partial<Record<PlayerId, PlayerId>>;
  courtWidthPx?: number;
};

function dist(a: Coord, b: Coord): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function moveToward(from: Coord, toward: Coord, distance: number): Coord {
  const dx = toward[0] - from[0];
  const dy = toward[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  return [from[0] + (dx / len) * distance, from[1] + (dy / len) * distance];
}

function clampCourt(point: Coord): Coord {
  return [Math.min(96, Math.max(4, point[0])), Math.min(96, Math.max(4, point[1]))];
}

function buildLayouts(
  placed: Map<PlayerId, Coord>,
  players: Record<string, DeckPlayer>,
  radiusSvg: number,
  unit: number
): MarkerLayout[] {
  const layouts: MarkerLayout[] = [];
  for (const [id, svg] of placed) {
    const player = players[id];
    if (!player) continue;
    const label = player.label.toUpperCase();
    const fontSizePx = markerFontSizePx(label, radiusSvg * unit);
    layouts.push({
      id,
      svg,
      radiusSvg,
      label,
      fontSizeSvg: fontSizePx / unit,
      box: labelBoxAt(svg[0] * unit, svg[1] * unit, label, fontSizePx),
    });
  }
  return layouts;
}

/**
 * Place markers from deck coords. Does not rewrite deck data.
 * Overlapping defender/man pairs offset the defender toward the rim.
 */
export function layoutMarkers({
  markers,
  players,
  matchups,
  courtWidthPx = labCourtWidthPx(),
}: LayoutArgs): MarkerLayout[] {
  const unit = svgUnitPx(courtWidthPx);
  const radiusSvg = markerRadiusSvg(courtWidthPx);
  const rimSvg = toSvgPoint(RIM_DECK);
  const minCenterSvg = 2 * radiusSvg - LABEL_OVERLAP_TOLERANCE_PX / unit;

  const placed = new Map<PlayerId, Coord>();
  for (const [id, coord] of Object.entries(markers)) {
    if (!coord) continue;
    placed.set(id as PlayerId, toSvgPoint(coord));
  }

  if (matchups) {
    for (const [defender, offense] of Object.entries(matchups)) {
      if (!offense) continue;
      const defenderPos = placed.get(defender as PlayerId);
      const offensePos = placed.get(offense);
      if (!defenderPos || !offensePos) continue;
      const gap = dist(defenderPos, offensePos);
      if (gap >= minCenterSvg) continue;
      placed.set(
        defender as PlayerId,
        clampCourt(moveToward(defenderPos, rimSvg, minCenterSvg - gap))
      );
    }
  }

  for (let iter = 0; iter < 16; iter += 1) {
    const layouts = buildLayouts(placed, players, radiusSvg, unit);
    let moved = false;
    for (let i = 0; i < layouts.length; i += 1) {
      for (let j = i + 1; j < layouts.length; j += 1) {
        const overlap = boxOverlapPx(layouts[i].box, layouts[j].box);
        if (overlap <= LABEL_OVERLAP_TOLERANCE_PX) continue;
        const a = layouts[i];
        const b = layouts[j];
        const mover = dist(a.svg, rimSvg) <= dist(b.svg, rimSvg) ? a : b;
        const extraSvg = (overlap + 3) / unit;
        placed.set(mover.id, clampCourt(moveToward(mover.svg, rimSvg, extraSvg)));
        moved = true;
      }
    }
    if (!moved) break;
  }

  return buildLayouts(placed, players, radiusSvg, unit);
}

function moveAway(from: Coord, obstacle: Coord, distance: number): Coord {
  const dx = from[0] - obstacle[0];
  const dy = from[1] - obstacle[1];
  const len = Math.hypot(dx, dy);
  if (len < 0.05) return clampCourt([from[0] + distance, from[1]]);
  return clampCourt([from[0] + (dx / len) * distance, from[1] + (dy / len) * distance]);
}

/** Nudge faint previous-position ghosts off live marker labels. */
export function separateGhostsFromLive(
  ghosts: MarkerLayout[],
  live: MarkerLayout[],
  courtWidthPx = labCourtWidthPx()
): MarkerLayout[] {
  if (ghosts.length === 0 || live.length === 0) return ghosts;
  const unit = svgUnitPx(courtWidthPx);
  const placed = new Map<PlayerId, Coord>(
    ghosts.map((ghost) => [ghost.id, [ghost.svg[0], ghost.svg[1]]])
  );

  for (let iter = 0; iter < 24; iter += 1) {
    let moved = false;
    for (const ghost of ghosts) {
      let svg = placed.get(ghost.id);
      if (!svg) continue;
      for (const marker of live) {
        if (marker.id === ghost.id) continue;
        const radiusPx = ghost.radiusSvg * unit;
        const disk: LabelBox = {
          x: svg[0] * unit - radiusPx,
          y: svg[1] * unit - radiusPx,
          w: radiusPx * 2,
          h: radiusPx * 2,
        };
        const overlap = boxOverlapPx(disk, marker.box);
        if (overlap <= LABEL_OVERLAP_TOLERANCE_PX) continue;
        svg = moveAway(svg, marker.svg, (overlap + 4) / unit);
        placed.set(ghost.id, svg);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return ghosts.map((ghost) => {
    const svg = placed.get(ghost.id) ?? ghost.svg;
    const dx = (svg[0] - ghost.svg[0]) * unit;
    const dy = (svg[1] - ghost.svg[1]) * unit;
    return {
      ...ghost,
      svg,
      box: { x: ghost.box.x + dx, y: ghost.box.y + dy, w: ghost.box.w, h: ghost.box.h },
    };
  });
}
