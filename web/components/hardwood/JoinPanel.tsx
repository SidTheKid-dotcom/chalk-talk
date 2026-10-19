type JoinPanelProps = {
  isStarting?: boolean;
  error?: string | null;
  onJoin?: () => void;
  actionLabel?: string;
  kicker?: string;
  title?: string;
  body?: string;
  note?: string | null;
};

export function JoinPanel({
  isStarting = false,
  error = null,
  onJoin,
  actionLabel,
  kicker = 'Film session · Game 7',
  title = 'Chalk Talk',
  body = 'The assistant coach walks you through the Game 7 plan by voice. Six slides. Cut in any time.',
  note = 'Camera space is reserved. Microphone access is requested when you join.',
}: JoinPanelProps) {
  return (
    <section className="join-card">
      <p className="lab" style={{ color: 'var(--gold)' }}>
        {kicker}
      </p>
      <h1>{title}</h1>
      <p className="font-inter mt-4 mb-0 text-[21px] leading-[1.45] text-[var(--ink-2)]">{body}</p>
      {note ? <p className="font-inter mt-6 mb-0 text-[16px] text-[var(--ink-3)]">{note}</p> : null}
      {onJoin ? (
        <button type="button" disabled={isStarting} onClick={onJoin} className="join-action">
          {actionLabel ?? (isStarting ? 'Opening film room' : 'Join film session')}
        </button>
      ) : actionLabel ? (
        <div className="join-action">{actionLabel}</div>
      ) : null}
      {error ? (
        <p className="font-inter mt-5 mb-0 border-l-4 border-[var(--red)] pl-4 text-[16px] text-[var(--ink)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
