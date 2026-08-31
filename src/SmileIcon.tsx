interface SmileIconProps {
  className?: string;
}

export default function SmileIcon({ className }: SmileIconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill="#7dd3fc" />
      <circle cx="11" cy="13" r="2" fill="#1e293b" />
      <circle cx="21" cy="13" r="2" fill="#1e293b" />
      <path d="M9 19Q16 25 23 19" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
