'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DrawnArrow } from '@/components/deck/PlayArrows';
import { getPlay } from '@/lib/deck/load';
import {
  frameAtElapsed,
  playFrame,
  playMotionSegments,
  prefersReducedMotion,
} from '@/lib/deck/plays';
import type { Coord, PlayId, PlayerId, SlideDiagram } from '@/lib/deck/types';

export type PlayMotionView = {
  markers?: Partial<Record<PlayerId, Coord>>;
  arrows: DrawnArrow[];
  ball?: PlayerId;
  caption: string | null;
};

export function usePlayMotion(
  diagram: SlideDiagram | null | undefined,
  playId: string | null,
  playSeq: number | null,
  animate: boolean
): PlayMotionView {
  const play = playId ? getPlay(playId as PlayId) : undefined;
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

    let frameId = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const next = frameAtElapsed(segments, now - started);
      if (next) {
        setView(next);
      }
      const total = segments.reduce((sum, segment) => sum + segment.durationMs, 0);
      if (now - started < total) {
        frameId = window.requestAnimationFrame(tick);
      }
    };
    setView(frameAtElapsed(segments, 0) ?? endFrame);
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [animate, diagram, endFrame, play, playSeq, segments]);

  return view;
}
