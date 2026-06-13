import {
  ArrowUpRight,
  FileText,
  Inbox,
  LayoutGrid,
  Rocket,
  Settings2,
} from "lucide-react";
import "./landing.css";

export function ProductPreview() {
  return (
    <div className="landing-float relative mx-auto w-full max-w-[54rem]">
      <div
        aria-hidden
        className="landing-pulse-ring pointer-events-none absolute -inset-4 border border-[var(--color-brand)]/10"
      />
      <div
        aria-hidden
        className="landing-preview-glow pointer-events-none absolute left-1/2 top-16 -z-10 h-32 w-[65%] -translate-x-1/2 rounded-full blur-[72px]"
      />

      <div className="landing-card relative z-0 overflow-hidden shadow-[0_8px_30px_-8px_oklch(0.30_0.08_155_/_0.1),0_32px_64px_-24px_oklch(0.30_0.08_155_/_0.18)]">
        <div className="landing-shine pointer-events-none absolute inset-0 z-10" />

        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-border-strong)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-border-strong)]" />
          </div>
          <div className="mx-auto flex h-7 min-w-0 max-w-xs flex-1 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
            <span className="landing-subtle truncate font-mono text-[11px]">
              studio.app / searchhub / pages / welcome
            </span>
          </div>
          <div className="hidden w-[52px] sm:block" />
        </div>

        <div className="grid min-h-[22rem] grid-cols-[13.5rem_minmax(0,1fr)] lg:min-h-[26rem]">
          {/* Sidebar */}
          <aside className="hidden border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:block">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-brand)] text-[10px] font-semibold text-[var(--color-brand-fg)]">
                SH
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold tracking-tight">SearchHub</div>
                <div className="landing-subtle font-mono text-[10px] uppercase tracking-[0.14em]">
                  Workspace
                </div>
              </div>
            </div>

            <nav className="space-y-0.5" aria-hidden>
              {[
                { icon: LayoutGrid, label: "Overview", active: false },
                { icon: FileText, label: "Pages", active: true },
                { icon: Inbox, label: "Forms", active: false },
                { icon: Settings2, label: "Settings", active: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className={[
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px]",
                    item.active
                      ? "bg-[var(--color-brand-50)] font-medium text-[var(--color-fg)]"
                      : "landing-muted",
                  ].join(" ")}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  {item.label}
                </div>
              ))}
            </nav>
          </aside>

          {/* Editor canvas */}
          <div className="relative bg-[var(--color-bg)] p-5 sm:p-7 lg:p-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--tone-draft-bg)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--tone-draft-fg)]">
                  Draft
                </span>
                <span className="landing-subtle text-[12px]">
                  Last edited 2m ago
                </span>
              </div>
              <div className="landing-btn inline-flex items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-fg)]">
                <Rocket className="h-3.5 w-3.5 text-[var(--color-brand)]" />
                Deploy
              </div>
            </div>

            <div className="mx-auto max-w-[38rem]">
              <h3
                className="text-[clamp(1.35rem,2.5vw,1.85rem)] leading-[1.15] tracking-tight text-[var(--color-fg)]"
                style={{ fontFamily: "var(--font-serif), serif" }}
              >
                Ship content without leaving the canvas
              </h3>

              <div
                className="landing-muted mt-5 space-y-3.5 text-[14px] leading-[1.75]"
                style={{ fontFamily: "var(--font-serif), serif" }}
              >
                <p>
                  Studio keeps every workspace, every draft, and every publish in one
                  editorial surface built for teams that care about craft.
                </p>
                <p>
                  Write in a focused serif canvas, triage inbound leads like an inbox,
                  and trigger static rebuilds the moment content goes live.
                </p>
              </div>

              <div className="mt-6 h-px bg-[var(--color-border)]" />

              <div className="mt-5 flex flex-wrap gap-2">
                {["SEO", "Scheduling", "Media", "API"].map((tag) => (
                  <span
                    key={tag}
                    className="landing-subtle rounded-md border border-[var(--landing-border)] bg-[var(--landing-surface)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.08em]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Floating deploy toast */}
            <div className="landing-card absolute bottom-5 right-5 hidden max-w-[15rem] border p-3 shadow-[0_12px_40px_-16px_oklch(0.22_0.01_270_/_0.35)] lg:block">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                <span className="text-[12px] font-medium">Build dispatched</span>
              </div>
              <p className="landing-muted text-[12px] leading-relaxed">
                Amplify webhook fired. SearchHub will be live in ~90s.
              </p>
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-brand)]">
                View pipeline
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
