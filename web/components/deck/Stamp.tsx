type StampProps = {
  label?: string;
  className?: string;
  animate?: boolean;
};

export function Stamp({ label = 'Game 7', className = '', animate = false }: StampProps) {
  return (
    <span
      className={`stamp font-archivo text-[28px] ${animate ? 'stamp-in' : ''} ${className}`}
      aria-hidden
    >
      {label}
    </span>
  );
}
