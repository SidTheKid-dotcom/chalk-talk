type CaptionProps = {
  text: string;
};

export function Caption({ text }: CaptionProps) {
  return <p className="caption-line m-0 text-[18px]">{text}</p>;
}
