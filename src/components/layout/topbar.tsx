import Link from "next/link";
import { ChevronsUpDown, ExternalLink, LogOut } from "lucide-react";
import type { Site, SiteRole } from "@/lib/supabase/types";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({
  site,
  role,
  user,
  allMemberships,
}: {
  site: Site;
  role: SiteRole;
  user: { email: string; fullName: string | null };
  allMemberships: Array<{ site: Site; role: SiteRole }>;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm shadow-xs">
            <span className="font-medium">{site.name}</span>
            <span className="text-[var(--color-fg-subtle)]">·</span>
            <span className="text-xs text-[var(--color-fg-muted)] capitalize">{role}</span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-[var(--color-fg-subtle)]" />
          </summary>
          <div className="absolute left-0 mt-1 w-72 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
            <ul className="max-h-72 overflow-auto py-1 text-sm">
              {allMemberships.map((m) => (
                <li key={m.site.id}>
                  <Link
                    href={`/${m.site.slug}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-[var(--color-surface-2)]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="grid h-6 w-6 place-items-center rounded text-[10px] font-semibold text-white"
                        style={{ background: m.site.brand?.primary ?? "#4f46e5" }}
                      >
                        {m.site.name.charAt(0)}
                      </span>
                      <span className="truncate">{m.site.name}</span>
                    </span>
                    <span className="text-xs text-[var(--color-fg-subtle)] capitalize">{m.role}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-xs">
              <Link href="/workspaces" className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
                See all workspaces →
              </Link>
            </div>
          </div>
        </details>

        {site.primary_domain && (
          <a
            href={`https://${site.primary_domain}`}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] sm:inline-flex"
          >
            View live site <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link
          href="/account"
          className="hidden text-right text-xs hover:opacity-80 sm:block"
        >
          <div className="font-medium leading-tight">{user.fullName ?? user.email}</div>
          <div className="text-[var(--color-fg-subtle)]">{user.email}</div>
        </Link>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="grid h-8 w-8 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] transition hover:text-[var(--color-fg)]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
