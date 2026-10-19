'use client';

import { type ReactNode } from 'react';
import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import { useStageChrome } from '@/components/deck/ScaledSlide';
import { CameraReserve } from '@/components/hardwood/CameraReserve';
import type { AgentState } from '@/lib/deck/types';
import { dsegText } from '@/lib/slide-transition';

type BottomRailProps = {
  state?: AgentState;
  topic?: string;
  slideNumber?: number | null;
  meta?: string;
  extra?: ReactNode;
  showCredits?: boolean;
};

function pillClass(state: AgentState): string {
  if (state === 'Speaking') return 'speaking';
  if (state === 'Thinking') return 'thinking';
  if (state === 'Listening') return 'listening';
  return 'idle';
}

function LevelBars() {
  return (
    <span className="bars" aria-hidden>
      <i style={{ height: 6 }} />
      <i style={{ height: 12 }} />
      <i style={{ height: 18 }} />
      <i style={{ height: 10 }} />
      <i style={{ height: 14 }} />
      <i style={{ height: 7 }} />
      <i style={{ height: 16 }} />
    </span>
  );
}

export function BottomRail({
  state = '—',
  topic = 'FILM SESSION',
  slideNumber = null,
  extra,
  showCredits = true,
}: BottomRailProps) {
  const n = slideNumber == null ? '0' : String(slideNumber);
  const { scale, reservePx } = useStageChrome();
  const paddingRight =
    reservePx > 0 ? Math.min(96 + reservePx / Math.max(scale, 0.2), 1500) : undefined;
  return (
    <footer className="rail" data-rail style={paddingRight ? { paddingRight } : undefined}>
      <div className={`pill ${pillClass(state)}`} data-state-pill={state}>
        <span className="dot" />
        {state === '—' ? 'Waiting' : state}
        {state === 'Speaking' ? <LevelBars /> : null}
      </div>
      <div className="ticker">
        <span className="led">{dsegText('GAME 7')}</span>
        <span className="sq" />
        <span className="led">{dsegText(topic.toUpperCase())}</span>
        <span className="sq" />
        <span className="led">{`${n}/6`}</span>
        {showCredits ? (
          <span className="meta">
            <PhotoCreditsLink />
          </span>
        ) : null}
      </div>
      <CameraReserve />
      {extra}
    </footer>
  );
}
