type KalamNoteProps = {
  text: string;
  className?: string;
};

export function KalamNote({ text, className = '' }: KalamNoteProps) {
  return (
    <p className={`font-kalam m-0 text-[22px] leading-snug text-[var(--blue)] ${className}`}>
      {text}
    </p>
  );
}
