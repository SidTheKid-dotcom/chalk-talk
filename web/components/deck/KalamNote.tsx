type KalamNoteProps = {
  text: string;
  className?: string;
};

export function KalamNote({ text, className = '' }: KalamNoteProps) {
  return (
    <p className={`font-kalam m-0 text-[32px] leading-snug text-[var(--gold)] ${className}`}>
      {text}
    </p>
  );
}
