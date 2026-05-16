import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminOverviewPage() {
  const sb = createSupabaseAdminClient();
  const [{ count: sites }, { count: users }, { count: subs }] = await Promise.all([
    sb.from("sites").select("id", { count: "exact", head: true }),
    sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("form_submissions").select("id", { count: "exact", head: true }),
  ]);

  const cards = [
    { label: "Sites", value: sites ?? 0, href: "/admin/sites", icon: Building2 },
    { label: "Users", value: users ?? 0, href: "/admin/users", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        description="Super-admin view across every workspace. Only users with is_platform_admin = true can see this."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <c.icon className="h-5 w-5 text-[var(--color-fg-subtle)]" />
              <div className="text-3xl font-semibold tracking-tight">{c.value}</div>
            </div>
            <div className="mt-3 text-sm text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg)]">
              {c.label}
            </div>
          </Link>
        ))}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
          <div className="text-sm text-[var(--color-fg-muted)]">Submissions (lifetime)</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">{subs ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
