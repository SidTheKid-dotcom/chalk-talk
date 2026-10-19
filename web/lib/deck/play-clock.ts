import {
  type PlayMotionSegment,
  type PlayViewFrame,
  SPEAKING_START_GRACE_MS,
  frameAtElapsed,
  interpolateMarkers,
  stepHoldMs,
} from '@/lib/deck/plays';

export type PlayClockMode = 'wall' | 'pace' | 'finish';

export type PlayClock = {
  mode: PlayClockMode;
  wallMs: number;
  /** Wall time spent on the caption-null start formation. */
  startMs: number;
  /** Captioned time accumulated only while the agent is speaking. */
  paceMs: number;
  /** Motion-only time after the speaking clock gives up. */
  finishMs: number;
  /** `startMs + paceMs` when finish mode began. */
  handoffMs: number;
  sawSpeaking: boolean;
  /** Continuous time spent with `speaking === false`. */
  quietMs: number;
};

export function createPlayClock(): PlayClock {
  return {
    mode: 'pace',
    wallMs: 0,
    startMs: 0,
    paceMs: 0,
    finishMs: 0,
    handoffMs: 0,
    sawSpeaking: false,
    quietMs: 0,
  };
}

function startLimit(segments: PlayMotionSegment[]): number {
  const first = segments[0];
  if (first && first.caption == null) return first.durationMs;
  return 0;
}

type Span = { tweenMs: number; holdMs: number };

function speechSpans(segments: PlayMotionSegment[]): Span[] {
  return segments.map((segment) => ({
    tweenMs: segment.durationMs,
    holdMs: stepHoldMs(segment),
  }));
}

function spanTotal(spans: Span[]): number {
  return spans.reduce((sum, span) => sum + span.tweenMs + span.holdMs, 0);
}

export function speechTimelineMs(segments: PlayMotionSegment[]): number {
  return spanTotal(speechSpans(segments));
}

export function motionTimelineMs(segments: PlayMotionSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.durationMs, 0);
}

function frameFromSegment(segment: PlayMotionSegment, t: number): PlayViewFrame {
  return {
    markers: interpolateMarkers(segment.from, segment.to, t),
    arrows: segment.arrows,
    ball: segment.ball,
    caption: segment.caption,
  };
}

function frameAtSpeech(segments: PlayMotionSegment[], elapsedMs: number): PlayViewFrame | null {
  if (segments.length === 0) return null;
  const spans = speechSpans(segments);
  let remaining = Math.max(0, elapsedMs);
  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index];
    const segment = segments[index];
    const spanMs = span.tweenMs + span.holdMs;
    const last = index === spans.length - 1;
    if (remaining < spanMs || last) {
      const into = last ? Math.min(remaining, spanMs) : remaining;
      const t = span.tweenMs === 0 ? 1 : Math.min(1, into / span.tweenMs);
      return frameFromSegment(segment, t);
    }
    remaining -= spanMs;
  }
  return null;
}

function locateSpeech(
  segments: PlayMotionSegment[],
  elapsedMs: number
): { index: number; into: number } | null {
  if (segments.length === 0) return null;
  const spans = speechSpans(segments);
  let remaining = Math.max(0, elapsedMs);
  for (let index = 0; index < spans.length; index += 1) {
    const spanMs = spans[index].tweenMs + spans[index].holdMs;
    if (remaining < spanMs || index === spans.length - 1) {
      return { index, into: Math.min(remaining, spanMs) };
    }
    remaining -= spanMs;
  }
  return null;
}

/** Deck tweens still left after `speechElapsedMs`, ignoring speech holds. */
export function motionLeftMs(segments: PlayMotionSegment[], speechElapsedMs: number): number {
  const located = locateSpeech(segments, speechElapsedMs);
  if (!located) return 0;
  const spans = speechSpans(segments);
  const span = spans[located.index];
  if (speechElapsedMs >= speechTimelineMs(segments)) return 0;
  let index = located.index;
  let tweenPos = Math.min(located.into, span.tweenMs);
  if (located.into >= span.tweenMs) {
    index += 1;
    tweenPos = 0;
  }
  if (index >= segments.length) return 0;
  let left = segments[index].durationMs - tweenPos;
  for (let next = index + 1; next < segments.length; next += 1) {
    left += segments[next].durationMs;
  }
  return left;
}

function frameWithFinish(
  segments: PlayMotionSegment[],
  speechElapsedMs: number,
  finishMs: number
): PlayViewFrame | null {
  if (segments.length === 0) return null;
  const located = locateSpeech(segments, speechElapsedMs);
  if (!located) return null;
  const spans = speechSpans(segments);
  const span = spans[located.index];
  let index = located.index;
  let tweenPos = Math.min(located.into, span.tweenMs);
  let budget = Math.max(0, finishMs);

  if (located.into >= span.tweenMs) {
    if (budget === 0) return frameFromSegment(segments[index], 1);
    index += 1;
    tweenPos = 0;
  }

  while (index < segments.length) {
    const duration = segments[index].durationMs;
    const left = duration - tweenPos;
    if (budget < left || index === segments.length - 1) {
      const intoTween = Math.min(duration, tweenPos + budget);
      const t = duration === 0 ? 1 : intoTween / duration;
      return frameFromSegment(segments[index], t);
    }
    budget -= left;
    index += 1;
    tweenPos = 0;
  }

  const last = segments[segments.length - 1];
  return frameFromSegment(last, 1);
}

export function frameForPlayClock(
  segments: PlayMotionSegment[],
  clock: PlayClock
): PlayViewFrame | null {
  if (clock.mode === 'wall') return frameAtElapsed(segments, clock.wallMs);
  if (clock.mode === 'finish') return frameWithFinish(segments, clock.handoffMs, clock.finishMs);
  return frameAtSpeech(segments, clock.startMs + clock.paceMs);
}

export function isPlayClockDone(segments: PlayMotionSegment[], clock: PlayClock): boolean {
  if (segments.length === 0) return true;
  if (clock.mode === 'wall') return clock.wallMs >= motionTimelineMs(segments);
  if (clock.mode === 'finish') return clock.finishMs >= motionLeftMs(segments, clock.handoffMs);
  return clock.startMs + clock.paceMs >= speechTimelineMs(segments);
}

/**
 * `speaking === undefined` is wall-clock (lab, or no agent). A boolean follows
 * the speaking clock: captioned steps move only while `speaking` is true.
 * `false` is listening or any other non-speaking state: the frame freezes.
 * After {@link SPEAKING_START_GRACE_MS} with no speech at all, remaining steps
 * play at deck `duration_ms` (clicker-silent). A pause after speech stays frozen
 * so a gap between captions cannot dump the rest of the play.
 */
export function advancePlayClock(
  clock: PlayClock,
  dtMs: number,
  speaking: boolean | undefined,
  segments: PlayMotionSegment[]
): PlayClock {
  const dt = Math.max(0, dtMs);
  if (speaking === undefined || clock.mode === 'wall') {
    return { ...clock, mode: 'wall', wallMs: clock.wallMs + dt };
  }
  if (clock.mode === 'finish') {
    return { ...clock, wallMs: clock.wallMs + dt, finishMs: clock.finishMs + dt };
  }

  const limit = startLimit(segments);
  const startRoom = Math.max(0, limit - clock.startMs);
  const startTake = Math.min(dt, startRoom);
  const startMs = clock.startMs + startTake;
  const afterStart = dt - startTake;
  const speakingNow = speaking === true;
  const paceMs = speakingNow && startMs >= limit ? clock.paceMs + afterStart : clock.paceMs;
  const quietMs = speakingNow ? 0 : clock.quietMs + dt;
  const sawSpeaking = clock.sawSpeaking || speakingNow;
  const wallMs = clock.wallMs + dt;
  const next: PlayClock = {
    ...clock,
    wallMs,
    startMs,
    paceMs,
    sawSpeaking,
    quietMs,
  };
  const speechElapsed = startMs + paceMs;
  const incomplete = speechElapsed < speechTimelineMs(segments);
  const neverSpoke = !sawSpeaking && wallMs >= SPEAKING_START_GRACE_MS;
  if (incomplete && neverSpoke) {
    const overflow = Math.max(0, wallMs - SPEAKING_START_GRACE_MS);
    return { ...next, mode: 'finish', handoffMs: speechElapsed, finishMs: overflow };
  }
  return next;
}
