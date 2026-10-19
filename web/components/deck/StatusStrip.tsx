import type { AgentState } from '@/lib/deck/types';

type StatusStripProps = {
  state?: AgentState;
  turn?: string;
  latencyMs?: string;
  interruptions?: string;
  coach?: string;
};

function StatePill({ state }: { state: AgentState }) {
  const filled = state === 'Speaking' || state === 'Thinking';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block size-2.5 rounded-full"
        style={{
          background: filled ? '#ffc72c' : 'transparent',
          boxShadow: `0 0 0 1.5px ${state === '—' ? '#f6f1e4' : '#ffc72c'}`,
        }}
        aria-hidden
      />
      <span>{state}</span>
    </span>
  );
}

export function StatusStrip({
  state = '—',
  turn = '—',
  latencyMs = '—',
  interruptions = '—',
  coach = '—',
}: StatusStripProps) {
  return (
    <div className="status-strip font-archivo flex h-14 items-center gap-8 px-8 text-[14px] tracking-[0.08em] text-[#f6f1e4]">
      <StatePill state={state} />
      <span>
        turn <span className="tabular">{turn}</span>
      </span>
      <span>
        latency <span className="tabular">{latencyMs}</span> ms
      </span>
      <span>
        interruptions <span className="tabular">{interruptions}</span>
      </span>
      <span className="ml-auto inline-flex items-center gap-2">
        <span className="size-2 rounded-full bg-[#1d428a]" aria-hidden />
        {coach}
      </span>
    </div>
  );
}
