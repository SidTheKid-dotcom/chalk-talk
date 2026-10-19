import { Paperclip } from '@/components/deck/Paperclip';
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
    <aside className="note-card w-[240px] px-4 pt-5 pb-4" data-note-kind={props.kind}>
      <span className="absolute -top-4 right-5">
        <Paperclip />
      </span>
      <p className="font-archivo m-0 text-[12px] tracking-wide text-[var(--ink-2)] uppercase">
        {label}
      </p>
      <p className="font-courier mt-2 mb-0 text-[14px] leading-snug text-[var(--ink)]">{body}</p>
      {meta ? (
        <p className="font-courier mt-2 mb-0 text-[11px] text-[var(--ink-2)]">{meta}</p>
      ) : null}
    </aside>
  );
}
