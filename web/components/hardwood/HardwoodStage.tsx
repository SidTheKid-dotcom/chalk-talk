import { type ReactNode } from 'react';
import { BottomRail } from '@/components/hardwood/BottomRail';
import { Scoreboard } from '@/components/hardwood/Scoreboard';
import type { AgentState, DeckSlide } from '@/lib/deck/types';

type HardwoodStageProps = {
  slide?: DeckSlide | null;
  status?: AgentState;
  topic?: string;
  notice?: string | null;
  vignette?: boolean;
  railExtra?: ReactNode;
  children: ReactNode;
};

export function HardwoodStage({
  slide = null,
  status = '—',
  topic,
  notice = null,
  vignette = false,
  railExtra,
  children,
}: HardwoodStageProps) {
  const resolvedTopic = topic ?? slide?.section ?? 'FILM SESSION';
  return (
    <div data-slide-desk className="hardwood-stage">
      <div className={`hardwood-floor ${vignette ? 'vignette' : ''}`} />
      <Scoreboard slideNumber={slide?.number ?? null} />
      <div className="hardwood-stage-clip" data-stage-clip>
        {notice ? (
          <aside className="notice-banner" role="status">
            {notice}
          </aside>
        ) : null}
        {children}
      </div>
      <BottomRail
        state={status}
        topic={resolvedTopic}
        slideNumber={slide?.number ?? null}
        extra={railExtra}
      />
    </div>
  );
}
