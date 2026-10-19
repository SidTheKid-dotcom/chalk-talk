'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DrawnArrow } from '@/components/deck/PlayArrows';
import { getPlay } from '@/lib/deck/load';
import {
  advancePlayClock,
  createPlayClock,
  frameForPlayClock,
  isPlayClockDone,
} from '@/lib/deck/play-clock';
import { playFrame, playMotionSegments, prefersReducedMotion } from '@/lib/deck/plays';
import type { Coord, PlayId, PlayerId, SlideDiagram } from '@/lib/deck/types';

export type PlayMotionView = {
  markers?: Partial<Record<PlayerId, Coord>>;
  arrows: DrawnArrow[];
  ball?: PlayerId;
  caption: string | null;
};

/**
 * `speaking === undefined` keeps the wall clock (lab, no agent).
 * `true` / `false` follow `useAgent().state === 'speaking'` (`lk.agent.state`).
 * The flag is read from a ref so a speaking change does not restart the play.
 */
export function usePlayMotion(
  diagram: SlideDiagram | null | undefined,
  playId: string | null,
  playSeq: number | null,
  animate: boolean,
  speaking?: boolean
): PlayMotionView {
  const play = playId ? getPlay(playId as PlayId) : undefined;
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const endFrame = useMemo(() => {
    if (!diagram || !play) return null;
    return playFrame(diagram, play);
  }, [diagram, play]);
  const segments = useMemo(() => {
    if (!diagram || !play) return [];
    return playMotionSegments(diagram, play);
  }, [diagram, play]);
  const [view, setView] = useState<PlayMotionView>({
    markers: endFrame?.markers,
    arrows: endFrame?.arrows ?? [],
    ball: endFrame?.ball,
    caption: endFrame?.caption ?? null,
  });

  useEffect(() => {
    if (!diagram || !play || !endFrame) {
      setView({ arrows: [], caption: null });
      return;
    }
    const shouldAnimate = animate && playSeq !== null && !prefersReducedMotion();
    if (!shouldAnimate) {
      setView({
        markers: endFrame.markers,
        arrows: endFrame.arrows,
        ball: endFrame.ball,
        caption: endFrame.caption,
      });
      return;
    }

    let clock = createPlayClock();
    let last = performance.now();
    let frameId = 0;
    const publish = (next: typeof clock) => {
      clock = next;
      const frame = frameForPlayClock(segments, clock);
      if (frame) setView(frame);
    };
    publish(clock);
    const tick = (now: number) => {
      const dt = Math.max(0, now - last);
      last = now;
      publish(advancePlayClock(clock, dt, speakingRef.current, segments));
      if (!isPlayClockDone(segments, clock)) {
        frameId = window.requestAnimationFrame(tick);
      }
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [animate, diagram, endFrame, play, playSeq, segments]);

  return view;
}
