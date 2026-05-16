import Link from "next/link";
import { ChevronsUpDown, ExternalLink, LogOut } from "lucide-react";
import type { Site, SiteRole } from "@/lib/supabase/types";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({
  site,
  role,
  user,
  allMemberships,
  isWhitelabel = false,
}: {
  site: Site;
  role: SiteRole;
  user: { email: string; fullName: string | null };
  allMemberships: Array<{ site: Site; role: SiteRole }>;
  isWhitelabel?: boolean;
}) {
  const initial = (user.fullName ?? user.email).charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-surface)_85%,transparent)] px-6 backdrop-blur"
    >
      <div className="flex items-center gap-3">
        <details className="relative group">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm transition hover:border-[var(--color-border-strong)]">
            <span
              className="grid h-5 w-5 place-items-center rounded text-[9px] font-semibold text-white"
              style={{ background: site.brand?.primary ?? "oklch(0.55 0.2 275)" }}
            >
              {site.name.charAt(0)}
            </span>
            <span className="font-medium text-[var(--color-fg)]">{site.name}</span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-[var(--color-fg-subtle)]" />
          </summary>
          <div className="absolute left-0 mt-1.5 w-80 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_8px_24px_-12px_oklch(0.18_0.01_270_/_0.15)]">
            <div className="border-b border-[var(--color-border)] px-3 py-2 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
              Workspaces
            </div>
            <ul className="max-h-72 overflow-auto py-1 text-sm">
              {allMemberships.map((m) => {
                const active = m.site.id === site.id;
                return (
                  <li key={m.site.id}>
                    <Link
                      href={`/${m.site.slug}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 transition hover:bg-[var(--color-surface-2)]"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded text-[10px] font-semibold text-white"
                          style={{ background: m.site.brand?.primary ?? "oklch(0.55 0.2 275)" }}
                        >
                          {m.site.name.charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{m.site.name}</span>
                          <span className="block truncate font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
                            {m.site.primary_domain ?? m.site.slug}
                          </span>
                        </span>
                      </span>
                      {active ? (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-brand)]">
                          Active
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                          {m.role}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!isWhitelabel && (
              <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5 text-xs">
                <Link
                  href="/workspaces"
                  className="font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                >
                  All workspaces →
                </Link>
              </div>
            )}
          </div>
        </details>

        <span className="hidden text-[var(--color-fg-subtle)] sm:inline">·</span>

        <span className="hidden font-mono text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)] sm:inline">
          {role}
        </span>

        {site.primary_domain && (
          <a
            href={`https://${site.primary_domain}`}
            target="_blank"
            rel="noreferrer"
            className="ml-2 hidden items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-[12px] text-[var(--color-fg-muted)] transition hover:border-[var(--color-border)] hover:text-[var(--color-fg)] md:inline-flex"
          >
            <span>{site.primary_domain}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <Link
          href="/account"
          className="ml-1 flex items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-[var(--color-surface-2)]"
        >
          <span
            className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: "oklch(0.45 0.10 275)" }}
          >
            {initial}
          </span>
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-xs font-medium">{user.fullName ?? user.email.split("@")[0]}</span>
            <span className="block text-[10.5px] text-[var(--color-fg-subtle)]">{user.email}</span>
          </span>
        </Link>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-fg-subtle)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
