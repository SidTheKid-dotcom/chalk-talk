type CaptionProps = {
  text: string;
};

export function Caption({ text }: CaptionProps) {
  return (
    <p className="caption-line m-0 min-w-0 flex-1 truncate text-[18px]" title={text}>
      {text}
    </p>
  );
}
