/**
 * Studio brand mark. Three stacked panels representing layered workspaces,
 * rendered as flat geometry on a single-color ink. No gradient (we explicitly
 * avoid the AI-purple gradient cliché). The amber dot is the only accent.
 *
 * The SVG is built on a 32-grid; viewBox keeps it crisp from 16px (favicon)
 * to 160px (splash).
 */
export function StudioMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* deep ink panel (back) */}
      <rect x="3" y="11" width="22" height="14" rx="3" fill="oklch(0.22 0.01 270)" />
      {/* mid indigo panel */}
      <rect x="6" y="8"  width="22" height="14" rx="3" fill="oklch(0.55 0.20 275)" />
      {/* top paper panel — readable */}
      <rect x="9" y="5"  width="20" height="12" rx="3" fill="oklch(0.98 0.005 80)" />
      {/* three serif baselines on the top panel: signals "content" */}
      <rect x="12" y="8.5"  width="14" height="1.25" rx="0.6" fill="oklch(0.22 0.01 270)" />
      <rect x="12" y="11"   width="11" height="1.25" rx="0.6" fill="oklch(0.45 0.01 270)" />
      <rect x="12" y="13.5" width="8"  height="1.25" rx="0.6" fill="oklch(0.62 0.008 270)" />
      {/* amber accent dot */}
      <circle cx="27" cy="4.5" r="2.2" fill="oklch(0.80 0.16 80)" />
    </svg>
  );
}

export function StudioWordmark({ size = 30 }: { size?: number }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <StudioMark size={size} />
      <div className="leading-tight">
        <div
          className="text-[15px] font-semibold tracking-tight text-[var(--color-fg)]"
          style={{ fontFamily: "var(--font-serif), serif" }}
        >
          Studio
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          Editorial CMS
        </div>
      </div>
    </div>
  );
}
