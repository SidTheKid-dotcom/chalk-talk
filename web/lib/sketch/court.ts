import type { Coord, ZoneBox } from '@/lib/deck/types';

/** Deck [x,y] → SVG with the rim on the right, baseline at x≈100. */
export function toSvg(x: number, y: number): Coord {
  return [100 - y, x];
}

export function toSvgPoint(point: Coord): Coord {
  return toSvg(point[0], point[1]);
}

export function zoneToSvg(box: ZoneBox): ZoneBox {
  const [x1, y1, x2, y2] = box;
  const a = toSvg(x1, y1);
  const b = toSvg(x2, y2);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}
