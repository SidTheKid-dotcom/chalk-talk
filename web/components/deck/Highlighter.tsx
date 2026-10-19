type HighlighterProps = {
  width?: number | string;
  height?: number | string;
  className?: string;
  animate?: boolean;
};

export function Highlighter({
  width = 72,
  height = 16,
  className = '',
  animate = false,
}: HighlighterProps) {
  return (
    <span
      className={`highlighter block ${animate ? 'swipe-in' : ''} ${className}`}
      style={{ width, height }}
      aria-hidden
    />
  );
}
