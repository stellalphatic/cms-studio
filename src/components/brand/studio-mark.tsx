/**
 * Studio brand mark. Two stacked rounded rectangles + an accent dot —
 * suggests "stacked workspaces" (multi-tenancy) without leaning on a generic
 * single-letter monogram.
 *
 * The size prop controls overall pixel dimensions; the SVG is responsive
 * via viewBox so it stays crisp at any scale (favicon → splash).
 */
export function StudioMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const gradId = `studio-brand-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect x="2" y="8" width="18" height="18" rx="4" fill="#6366F1" opacity="0.32" />
      <rect x="7" y="6" width="18" height="18" rx="4" fill={`url(#${gradId})`} />
      <circle cx="26.5" cy="7.5" r="2.2" fill="#FBBF24" />
    </svg>
  );
}

export function StudioWordmark({ size = 32 }: { size?: number }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <StudioMark size={size} />
      <div className="leading-tight">
        <div className="text-base font-semibold tracking-tight">Studio</div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-muted)]">
          Multi-site CMS
        </div>
      </div>
    </div>
  );
}
