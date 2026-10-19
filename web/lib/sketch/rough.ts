export type Point = [number, number];

export function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededTilt(seed: string, maxDeg = 4): number {
  const rng = mulberry32(hashSeed(seed));
  return (rng() * 2 - 1) * maxDeg;
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first[0].toFixed(2)} ${first[1].toFixed(2)} ${rest
    .map((point) => `L ${point[0].toFixed(2)} ${point[1].toFixed(2)}`)
    .join(' ')}`;
}

export function roughLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number,
  roughness = 1.05
): string {
  const rng = mulberry32(seed);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = Math.max(4, Math.min(10, Math.round(len / 14)));
  const points: Point[] = [[x1, y1]];

  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const bow = Math.sin(t * Math.PI) * (rng() - 0.5) * roughness;
    const jitter = (rng() - 0.5) * roughness * 0.45;
    points.push([x1 + dx * t + nx * (bow + jitter), y1 + dy * t + ny * (bow + jitter)]);
  }

  points.push([x2, y2]);
  return pointsToPath(points);
}

export function roughRect(
  x: number,
  y: number,
  width: number,
  height: number,
  seed: number,
  roughness = 0.9
): string {
  const a = hashSeed(`${seed}-n`);
  const b = hashSeed(`${seed}-e`);
  const c = hashSeed(`${seed}-s`);
  const d = hashSeed(`${seed}-w`);
  return [
    roughLine(x, y, x + width, y, a, roughness),
    roughLine(x + width, y, x + width, y + height, b, roughness),
    roughLine(x + width, y + height, x, y + height, c, roughness),
    roughLine(x, y + height, x, y, d, roughness),
  ].join(' ');
}

export function roughCircle(
  cx: number,
  cy: number,
  r: number,
  seed: number,
  roughness = 0.7
): string {
  const rng = mulberry32(seed);
  const steps = 20;
  const points: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const jitter = 1 + (rng() - 0.5) * 0.04 * roughness;
    points.push([cx + Math.cos(t) * r * jitter, cy + Math.sin(t) * r * jitter]);
  }
  return `${pointsToPath(points)} Z`;
}

export function smoothPath(points: Point[], seed: number, roughness = 0.8): string {
  if (points.length < 2) return pointsToPath(points);
  const rng = mulberry32(seed);
  const jittered = points.map<Point>(([x, y], index) => {
    if (index === 0 || index === points.length - 1) return [x, y];
    return [x + (rng() - 0.5) * roughness, y + (rng() - 0.5) * roughness];
  });

  let d = `M ${jittered[0][0].toFixed(2)} ${jittered[0][1].toFixed(2)}`;
  for (let i = 1; i < jittered.length; i += 1) {
    const prev = jittered[i - 1];
    const curr = jittered[i];
    const mx = (prev[0] + curr[0]) / 2;
    const my = (prev[1] + curr[1]) / 2;
    d += ` Q ${prev[0].toFixed(2)} ${prev[1].toFixed(2)} ${mx.toFixed(2)} ${my.toFixed(2)}`;
    if (i === jittered.length - 1) {
      d += ` T ${curr[0].toFixed(2)} ${curr[1].toFixed(2)}`;
    }
  }
  return d;
}

export function curveThrough(from: Point, to: Point, seed: number, bow = 8): string {
  const rng = mulberry32(seed);
  const mx = (from[0] + to[0]) / 2;
  const my = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const offset = (rng() - 0.35) * bow;
  const cx = mx + nx * offset;
  const cy = my + ny * offset;
  return `M ${from[0].toFixed(2)} ${from[1].toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${to[0].toFixed(2)} ${to[1].toFixed(2)}`;
}

export function zigzagPath(from: Point, to: Point, seed: number): string {
  const rng = mulberry32(seed);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const zigs = Math.max(4, Math.round(len / 7));
  const points: Point[] = [from];
  for (let i = 1; i < zigs; i += 1) {
    const t = i / zigs;
    const amp = (i % 2 === 0 ? 1 : -1) * (1.6 + rng() * 0.5);
    points.push([from[0] + dx * t + nx * amp, from[1] + dy * t + ny * amp]);
  }
  points.push(to);
  return pointsToPath(points);
}

export function screenBar(from: Point, to: Point, seed: number): string {
  const body = roughLine(from[0], from[1], to[0], to[1], seed, 0.7);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const half = 3.4;
  const bar = roughLine(
    to[0] + nx * half,
    to[1] + ny * half,
    to[0] - nx * half,
    to[1] - ny * half,
    seed + 17,
    0.5
  );
  return `${body} ${bar}`;
}

export function arrowHead(from: Point, to: Point, size = 2.6): string {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const left: Point = [to[0] - ux * size + -uy * size * 0.7, to[1] - uy * size + ux * size * 0.7];
  const right: Point = [to[0] - ux * size + uy * size * 0.7, to[1] - uy * size + -ux * size * 0.7];
  return `M ${left[0].toFixed(2)} ${left[1].toFixed(2)} L ${to[0].toFixed(2)} ${to[1].toFixed(2)} L ${right[0].toFixed(2)} ${right[1].toFixed(2)}`;
}

export function pathLengthApprox(from: Point, to: Point): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1]);
}
