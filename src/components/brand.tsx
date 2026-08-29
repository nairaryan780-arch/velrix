export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="vlx" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <path d="M4 5h6l6 14 6-14h6L18 30h-4L4 5Z" fill="url(#vlx)" />
      <circle cx="16" cy="7.5" r="2.4" fill="#e9eef6" />
    </svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <Logo size={size} />
      <span style={{ fontWeight: 700, letterSpacing: "-0.03em", fontSize: size * 0.72 }}>Velrix</span>
    </span>
  );
}
