import type { Fact } from '@/lib/deck/types';

type NoteCardProps =
  | {
      kind: 'fact';
      fact: Fact;
    }
  | {
      kind: 'text';
      text: string;
    };

export function NoteCard(props: NoteCardProps) {
  const label = props.kind === 'fact' ? props.fact.id : "Coach's note";
  const body = props.kind === 'fact' ? props.fact.claim : props.text;
  const meta = props.kind === 'fact' ? props.fact.source_domain : null;

  return (
    <aside className="note-card" data-note-kind={props.kind}>
      <p className="lab m-0">{label}</p>
      <p className="row-detail mt-3 mb-0 text-[21px] text-[var(--ink)]">{body}</p>
      {meta ? (
        <p className="lab mt-3 mb-0" style={{ color: 'var(--ink-3)' }}>
          {meta}
        </p>
      ) : null}
    </aside>
  );
}
