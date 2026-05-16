import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  action,
  crumbs,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  crumbs?: Crumb[];
  eyebrow?: string;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        {(crumbs?.length || eyebrow) && (
          <nav className="mb-2 flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
            {eyebrow && <span>{eyebrow}</span>}
            {crumbs?.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {(eyebrow || i > 0) && <ChevronRight className="h-3 w-3" />}
                {c.href ? (
                  <Link href={c.href} className="hover:text-[var(--color-fg)]">
                    {c.label}
                  </Link>
                ) : (
                  <span>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-serif text-[28px] leading-tight tracking-tight text-[var(--color-fg)]"
            style={{ fontFamily: "var(--font-serif), serif" }}>
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-[60ch] text-sm text-[var(--color-fg-muted)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
