import type { ArrowKind, Coord } from '@/lib/deck/types';
import {
  type Point,
  arrowHead,
  curveThrough,
  hashSeed,
  pathLengthApprox,
  screenBar,
  zigzagPath,
} from '@/lib/sketch/rough';

export type DrawnArrow = {
  from: Coord;
  to: Coord;
  kind: ArrowKind;
  option?: boolean;
  key: string;
  /** Tween length for `.draw-stroke`. Speech holds do not stretch the stroke. */
  drawMs?: number;
};

type PlayArrowsProps = {
  arrows: DrawnArrow[];
  animate?: boolean;
};

function kindPath(from: Point, to: Point, kind: ArrowKind, seed: number): string {
  if (kind === 'dribble') return zigzagPath(from, to, seed);
  if (kind === 'screen') return screenBar(from, to, seed);
  return curveThrough(from, to, seed, kind === 'pass' ? 10 : 7);
}

function strokeFor(kind: ArrowKind): string {
  if (kind === 'pass' || kind === 'screen') return '#FFFFFF';
  return '#FFC72C';
}

export function PlayArrows({ arrows, animate = false }: PlayArrowsProps) {
  return (
    <g>
      {arrows.map((arrow) => {
        const seed = hashSeed(arrow.key);
        const from = arrow.from;
        const to = arrow.to;
        const d = kindPath(from, to, arrow.kind, seed);
        const option = Boolean(arrow.option);
        const dashed = option || arrow.kind === 'pass' || arrow.kind === 'cut';
        const length = Math.max(24, pathLengthApprox(from, to) * 1.2);
        const color = strokeFor(arrow.kind);
        return (
          <g key={arrow.key} opacity={option ? 0.38 : 1}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={option ? 1.15 : 1.7}
              strokeDasharray={arrow.kind === 'pass' ? '1.2 2.4' : dashed ? '2.8 1.6' : undefined}
              strokeLinecap="round"
              className={animate && !option ? 'draw-stroke' : undefined}
              style={
                animate && !option
                  ? {
                      ['--dash' as string]: length,
                      ['--draw-ms' as string]: `${arrow.drawMs ?? 900}ms`,
                    }
                  : undefined
              }
            />
            {arrow.kind !== 'screen' ? (
              <path d={arrowHead(from, to)} fill="none" stroke={color} strokeWidth="1.4" />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
