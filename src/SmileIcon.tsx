import { useId } from "react";

interface SmileIconProps {
  className?: string;
}

export default function SmileIcon({ className }: SmileIconProps) {
  const id = useId();
  const gradId = `si-g-${id}`;

  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="7" fill={`url(#${gradId})`} />
      <circle cx="11" cy="13" r="1.8" fill="#0f172a" />
      <circle cx="21" cy="13" r="1.8" fill="#0f172a" />
      <path d="M8 18.5Q16 27 24 18.5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
    </svg>
  );
}
