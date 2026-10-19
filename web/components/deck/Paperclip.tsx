type PaperclipProps = {
  className?: string;
};

export function Paperclip({ className = '' }: PaperclipProps) {
  return (
    <svg
      className={`pointer-events-none ${className}`}
      width="28"
      height="48"
      viewBox="0 0 28 48"
      aria-hidden
    >
      <path
        d="M9 20v-9.5c0-3.4 2.6-6 5.8-6s5.8 2.6 5.8 6v18.2c0 5.2-4 9.4-9 9.4s-9-4.2-9-9.4V16.2"
        fill="none"
        stroke="#7a756c"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BinderClip({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="54" height="36" viewBox="0 0 54 36" aria-hidden>
      <rect x="18" y="10" width="18" height="22" rx="2" fill="#2b2824" />
      <path d="M8 12h38l-4 10H12L8 12z" fill="#1b1916" />
      <rect x="20" y="4" width="14" height="10" rx="1.5" fill="#3a3631" />
    </svg>
  );
}
