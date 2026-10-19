type CaptionProps = {
  text: string;
};

export function Caption({ text }: CaptionProps) {
  return (
    <p className="caption-line m-0" title={text} aria-label={text || undefined}>
      {text}
    </p>
  );
}
