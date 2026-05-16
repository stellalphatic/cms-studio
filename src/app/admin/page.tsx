import Link from "next/link";
import { ArrowUpRight, Building2, Inbox, Users } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminOverviewPage() {
  const sb = createSupabaseAdminClient();
  const [{ count: sites }, { count: users }, { count: subs }] = await Promise.all([
    sb.from("sites").select("id", { count: "exact", head: true }),
    sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("form_submissions").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Platform overview"
        description="Super-admin view across every workspace. Only users with is_platform_admin = true can see this."
        eyebrow="Admin"
      />

      <section className="grid gap-px overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-3">
        <Stat label="Sites" total={sites ?? 0} href="/admin/sites" icon={Building2} />
        <Stat label="Users" total={users ?? 0} href="/admin/users" icon={Users} />
        <Stat label="Submissions" total={subs ?? 0} sub="Lifetime" icon={Inbox} />
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          Reminders
        </div>
        <h3
          className="mt-1 text-[18px] font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-serif), serif" }}
        >
          Keep the platform healthy
        </h3>
        <ul className="mt-4 space-y-3 text-[13.5px] text-[var(--color-fg-muted)]">
          <li className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] text-[var(--color-fg-subtle)]">01</span>
            <span>
              Each site should have its own Resend key set in Settings. Defaults
              fall back to the platform key.
            </span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] text-[var(--color-fg-subtle)]">02</span>
            <span>
              Amplify webhook URLs should be configured per site to trigger
              rebuilds on publish.
            </span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] text-[var(--color-fg-subtle)]">03</span>
            <span>
              Rotate API keys quarterly. Revoke unused keys from each
              workspace&apos;s API page.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  total,
  sub,
  href,
  icon: Icon,
}: {
  label: string;
  total: number | string;
  sub?: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-fg-subtle)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tabular tracking-tight text-[var(--color-fg)]">
        {total}
      </div>
      {sub && (
        <div className="mt-1.5 text-[11.5px] text-[var(--color-fg-muted)] tabular">{sub}</div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group flex items-end justify-between gap-4 bg-[var(--color-surface)] px-5 py-5 transition hover:bg-[var(--color-surface-2)]"
      >
        <div className="min-w-0">{inner}</div>
        <ArrowUpRight className="h-4 w-4 text-[var(--color-fg-subtle)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--color-fg)]" />
      </Link>
    );
  }
  return <div className="bg-[var(--color-surface)] px-5 py-5">{inner}</div>;
}
