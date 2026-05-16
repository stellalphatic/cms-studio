import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getWhitelabelSite } from "@/lib/host";
import { StudioMark } from "@/components/brand/studio-mark";
import { Empty } from "@/components/ui/surface";

export const metadata = { title: "Workspaces" };

export default async function WorkspacesPage() {
  const ctx = await requireUser();
  const whitelabel = await getWhitelabelSite();
  if (whitelabel) redirect(`/${whitelabel.slug}`);

  const greeting = greet(ctx.profile.full_name);

  return (
    <div className="min-h-svh bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <StudioMark size={28} />
            <span
              className="text-[15px] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              Studio
            </span>
          </div>
          <div className="flex items-center gap-3">
            {ctx.profile.is_platform_admin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Platform admin
              </Link>
            )}
            <form action="/auth/sign-out" method="post">
              <button className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 pt-16 pb-24">
        <div className="mb-10 max-w-2xl">
          <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            {ctx.memberships.length} workspace{ctx.memberships.length === 1 ? "" : "s"}
          </div>
          <h1
            className="text-[40px] leading-[1.1] tracking-tight text-[var(--color-fg)]"
            style={{ fontFamily: "var(--font-serif), serif" }}
          >
            {greeting}, {firstName(ctx.profile.full_name ?? ctx.profile.email)}.
          </h1>
          <p className="mt-3 max-w-[60ch] text-[14.5px] text-[var(--color-fg-muted)]">
            Pick a site to start writing, triaging the inbox, or shipping a new
            article. Each workspace remembers your last view.
          </p>
        </div>

        {ctx.memberships.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Empty
              title="No workspaces yet"
              hint="Ask your administrator for an invitation, or check whether the right account is being used."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {ctx.memberships.map((m) => (
              <li key={m.site.id}>
                <Link
                  href={`/${m.site.slug}`}
                  className="group flex items-center justify-between gap-6 px-6 py-5 transition hover:bg-[var(--color-surface-2)]"
                >
                  <div className="flex min-w-0 items-center gap-5">
                    <div
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-base font-semibold text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.15)]"
                      style={{ background: m.site.brand?.primary ?? "oklch(0.55 0.2 275)" }}
                    >
                      {m.site.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate text-[17px] font-semibold tracking-tight"
                        style={{ fontFamily: "var(--font-serif), serif" }}
                      >
                        {m.site.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-[var(--color-fg-muted)]">
                        <span className="font-mono">{m.site.primary_domain ?? m.site.slug}</span>
                        <span className="text-[var(--color-fg-subtle)]">·</span>
                        <span className="font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
                          {m.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-[var(--color-fg-subtle)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-fg)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function greet(_name: string | null): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good evening";
}

function firstName(input: string): string {
  return input.split(/\s+|@/)[0] || input;
}
