import type { DrawnArrow } from '@/components/deck/PlayArrows';
import type { Coord, DeckPlay, PlayerId, SlideDiagram } from '@/lib/deck/types';

export const PLAY_START_DURATION_MS = 300;

export type PlayViewFrame = {
  markers: Partial<Record<PlayerId, Coord>>;
  arrows: DrawnArrow[];
  ball?: PlayerId;
  caption: string | null;
};

export type PlayMotionSegment = {
  from: Partial<Record<PlayerId, Coord>>;
  to: Partial<Record<PlayerId, Coord>>;
  arrows: DrawnArrow[];
  liveArrows: DrawnArrow[];
  ball?: PlayerId;
  caption: string | null;
  durationMs: number;
};

export function playDurationMs(play: DeckPlay): number {
  return play.steps.reduce((sum, step) => sum + step.duration_ms, 0);
}

export function playStartMarkers(
  diagram: SlideDiagram,
  play: DeckPlay
): Partial<Record<PlayerId, Coord>> {
  return {
    ...diagram.markers,
    ...(play.start?.positions ?? {}),
  };
}

export function playFrame(diagram: SlideDiagram, play: DeckPlay): PlayViewFrame {
  const markers: Partial<Record<PlayerId, Coord>> = playStartMarkers(diagram, play);
  const arrows: DrawnArrow[] = [];
  let ball: PlayerId | undefined = play.start?.ball;

  play.steps.forEach((step, stepIndex) => {
    step.arrows.forEach((arrow, arrowIndex) => {
      const from = markers[arrow.from] ?? diagram.markers[arrow.from];
      if (!from) return;
      arrows.push({
        from,
        to: arrow.to,
        kind: arrow.kind,
        option: arrow.option,
        key: `${play.id}-${stepIndex}-${arrowIndex}`,
      });
    });
    Object.assign(markers, step.moves);
    ball = step.ball;
  });

  const last = play.steps[play.steps.length - 1];
  return { markers, arrows, ball, caption: last?.caption ?? null };
}

export function playMotionSegments(diagram: SlideDiagram, play: DeckPlay): PlayMotionSegment[] {
  const segments: PlayMotionSegment[] = [];
  let markers: Partial<Record<PlayerId, Coord>> = { ...diagram.markers };
  let arrows: DrawnArrow[] = [];
  let ball: PlayerId | undefined;

  if (play.start) {
    const next = playStartMarkers(diagram, play);
    segments.push({
      from: { ...markers },
      to: next,
      arrows: [],
      liveArrows: [],
      ball: play.start.ball,
      caption: null,
      durationMs: PLAY_START_DURATION_MS,
    });
    markers = next;
    ball = play.start.ball;
  }

  play.steps.forEach((step, stepIndex) => {
    const from = { ...markers };
    const live: DrawnArrow[] = [];
    step.arrows.forEach((arrow, arrowIndex) => {
      const origin = from[arrow.from] ?? diagram.markers[arrow.from];
      if (!origin) return;
      live.push({
        from: origin,
        to: arrow.to,
        kind: arrow.kind,
        option: arrow.option,
        key: `${play.id}-${stepIndex}-${arrowIndex}`,
      });
    });
    markers = { ...markers, ...step.moves };
    arrows = [...arrows, ...live];
    ball = step.ball;
    segments.push({
      from,
      to: { ...markers },
      arrows: [...arrows],
      liveArrows: live,
      ball,
      caption: step.caption,
      durationMs: step.duration_ms,
    });
  });

  return segments;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function interpolateMarkers(
  from: Partial<Record<PlayerId, Coord>>,
  to: Partial<Record<PlayerId, Coord>>,
  t: number
): Partial<Record<PlayerId, Coord>> {
  const ids = new Set([...Object.keys(from), ...Object.keys(to)]) as Set<PlayerId>;
  const next: Partial<Record<PlayerId, Coord>> = {};
  for (const id of ids) {
    const start = from[id] ?? to[id];
    const end = to[id] ?? from[id];
    if (!start || !end) continue;
    next[id] = [lerp(start[0], end[0], t), lerp(start[1], end[1], t)];
  }
  return next;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function frameAtElapsed(
  segments: PlayMotionSegment[],
  elapsedMs: number
): PlayViewFrame | null {
  if (segments.length === 0) return null;
  let remaining = elapsedMs;
  for (const segment of segments) {
    if (remaining < segment.durationMs) {
      const t = segment.durationMs === 0 ? 1 : remaining / segment.durationMs;
      return {
        markers: interpolateMarkers(segment.from, segment.to, t),
        arrows: segment.arrows,
        ball: segment.ball,
        caption: segment.caption,
      };
    }
    remaining -= segment.durationMs;
  }
  const last = segments[segments.length - 1];
  return {
    markers: last.to,
    arrows: last.arrows,
    ball: last.ball,
    caption: last.caption,
  };
}
