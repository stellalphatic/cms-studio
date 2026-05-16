import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, LogOut, ShieldCheck, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getWhitelabelSite } from "@/lib/host";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { StudioMark } from "@/components/brand/studio-mark";

export const metadata = { title: "Platform admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUser();
  if (!ctx.profile.is_platform_admin) redirect("/");
  const whitelabel = await getWhitelabelSite();
  if (whitelabel) redirect("/");

  return (
    <div className="min-h-svh bg-[var(--color-bg)]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-surface)_85%,transparent)] px-6 backdrop-blur">
        <Link href="/admin" className="flex items-center gap-2.5">
          <StudioMark size={24} />
          <span
            className="text-[15px] font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-serif), serif" }}
          >
            Studio
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            Platform
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/workspaces"
            className="rounded-md px-2.5 py-1.5 text-xs text-[var(--color-fg-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
          >
            Workspaces
          </Link>
          <ThemeToggle />
          <Link
            href="/account"
            className="hidden text-right text-xs hover:opacity-80 sm:block"
          >
            <div className="font-medium leading-tight">{ctx.profile.full_name ?? ctx.user.email}</div>
            <div className="text-[var(--color-fg-subtle)]">{ctx.user.email}</div>
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

      <div className="mx-auto grid max-w-6xl grid-cols-[200px_minmax(0,1fr)] gap-10 px-8 py-10">
        <aside>
          <div className="mb-3 px-3 text-[10.5px] font-medium uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            Platform
          </div>
          <ul className="space-y-px text-sm">
            <NavItem href="/admin" icon={ShieldCheck} label="Overview" />
            <NavItem href="/admin/sites" icon={Building2} label="Sites" />
            <NavItem href="/admin/users" icon={Users} label="Users" />
          </ul>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13.5px] text-[var(--color-fg)] transition hover:bg-[var(--color-surface-2)]"
      >
        <Icon className="h-[15px] w-[15px] text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg)]" />
        <span>{label}</span>
      </Link>
    </li>
  );
}
