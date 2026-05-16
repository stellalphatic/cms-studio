import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getWhitelabelSite } from "@/lib/host";
import { StudioWordmark } from "@/components/brand/studio-mark";

export const metadata = { title: "Workspaces" };

export default async function WorkspacesPage() {
  const ctx = await requireUser();
  const whitelabel = await getWhitelabelSite();
  if (whitelabel) redirect(`/${whitelabel.slug}`);

  return (
    <div className="min-h-svh bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <StudioWordmark size={32} />
          <div className="flex items-center gap-2">
            {ctx.profile.is_platform_admin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-surface-2)]"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Platform admin
              </Link>
            )}
            <form action="/auth/sign-out" method="post">
              <button className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a workspace</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Hi {ctx.profile.full_name ?? ctx.profile.email} — pick a site to start managing content,
            forms and people.
          </p>
        </div>

        {ctx.memberships.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
            <Building2 className="mx-auto h-8 w-8 text-[var(--color-fg-subtle)]" />
            <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
              You don&apos;t have access to any workspaces yet.
              <br />
              Ask your administrator for an invitation.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {ctx.memberships.map((m) => (
              <li key={m.site.id}>
                <Link
                  href={`/${m.site.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-border-strong)] hover:shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-semibold text-white"
                      style={{ background: m.site.brand?.primary ?? "#4f46e5" }}
                    >
                      {m.site.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{m.site.name}</div>
                      <div className="truncate text-xs text-[var(--color-fg-muted)]">
                        {m.site.primary_domain ?? m.site.slug} · {m.role}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--color-fg-subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-fg)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
