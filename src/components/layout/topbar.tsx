import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import type { Site, SiteRole } from "@/lib/supabase/types";
import { ThemeToggle } from "./theme-toggle";
import { SectionCrumb } from "./section-crumb";

export function Topbar({
  site,
  role,
  user,
  allMemberships: _allMemberships,
  isWhitelabel: _isWhitelabel = false,
}: {
  site: Site;
  role: SiteRole;
  user: { email: string; fullName: string | null };
  allMemberships: Array<{ site: Site; role: SiteRole }>;
  isWhitelabel?: boolean;
}) {
  const initial = (user.fullName ?? user.email).charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-surface)_82%,transparent)] px-6 backdrop-blur">
      {/* Left: scope = current site + section crumb. The workspace switcher
          lives in the sidebar header now to avoid duplication. */}
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={`/${site.slug}`}
          className="flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-[var(--color-surface-2)]"
        >
          <span
            className="grid h-5 w-5 place-items-center rounded text-[9px] font-semibold text-white"
            style={{ background: site.brand?.primary ?? "oklch(0.55 0.2 275)" }}
          >
            {site.name.charAt(0)}
          </span>
          <span
            className="font-medium text-[var(--color-fg)]"
            style={{ fontFamily: "var(--font-serif), serif" }}
          >
            {site.name}
          </span>
        </Link>

        <SectionCrumb siteSlug={site.slug} />

        <span
          className="ml-2 hidden font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)] lg:inline"
          title={`Your role on this workspace`}
        >
          · {role}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {site.primary_domain && (
          <a
            href={`https://${site.primary_domain}`}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-[12px] text-[var(--color-fg-muted)] transition hover:border-[var(--color-border)] hover:text-[var(--color-fg)] md:inline-flex"
            title="Open the live site"
          >
            <span className="font-mono">{site.primary_domain}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
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
            <span className="block text-xs font-medium">
              {user.fullName ?? user.email.split("@")[0]}
            </span>
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
