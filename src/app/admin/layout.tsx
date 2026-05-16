import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, LogOut, ShieldCheck, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata = { title: "Platform Admin · Studio" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireUser();
  if (!ctx.profile.is_platform_admin) redirect("/");

  return (
    <div className="min-h-svh bg-[var(--color-bg)]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-6 backdrop-blur">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-[var(--color-brand)]" />
          Studio · Platform Admin
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/workspaces"
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
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
              className="grid h-8 w-8 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg-muted)] transition hover:text-[var(--color-fg)]"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-[200px_1fr] gap-8 px-6 py-8">
        <aside className="space-y-1 text-sm">
          <div className="mb-3 px-3 text-[11px] font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">
            Platform
          </div>
          <NavItem href="/admin" icon={ShieldCheck} label="Overview" />
          <NavItem href="/admin/sites" icon={Building2} label="Sites" />
          <NavItem href="/admin/users" icon={Users} label="Users" />
        </aside>
        <main>{children}</main>
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
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[var(--color-fg)] transition hover:bg-[var(--color-surface-2)]"
    >
      <Icon className="h-4 w-4 text-[var(--color-fg-subtle)]" />
      <span>{label}</span>
    </Link>
  );
}
