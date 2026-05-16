import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { AdminToggle } from "./admin-toggle";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  is_platform_admin: boolean;
  created_at: string;
}

interface MembershipRow {
  user_id: string;
  role: string;
  // Supabase can return the joined `site` as a single row OR as an array
  // depending on the relationship type. Handle both shapes below.
  site: { slug: string; name: string } | { slug: string; name: string }[] | null;
}

export default async function AdminUsersPage() {
  const ctx = await requireUser();
  const sb = createSupabaseAdminClient();
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, email, full_name, is_platform_admin, created_at")
    .order("created_at", { ascending: true });

  const { data: memberships } = await sb
    .from("site_members")
    .select("user_id, role, site:sites(slug, name)");

  const memberMap = new Map<string, Array<{ slug: string; name: string; role: string }>>();
  for (const m of (memberships ?? []) as unknown as MembershipRow[]) {
    if (!m.site) continue;
    const sites = Array.isArray(m.site) ? m.site : [m.site];
    const arr = memberMap.get(m.user_id) ?? [];
    for (const s of sites) arr.push({ slug: s.slug, name: s.name, role: m.role });
    memberMap.set(m.user_id, arr);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Every user across the platform. Promote teammates to platform admin to give them super-admin powers (create sites, invite anywhere)."
      />

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Workspaces</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(profiles as ProfileRow[] | null)?.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.full_name ?? p.email.split("@")[0]}</div>
                  <div className="text-xs text-[var(--color-fg-muted)]">{p.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
                  {(memberMap.get(p.id) ?? []).map((m) => `${m.name} (${m.role})`).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">{formatDate(p.created_at)}</td>
                <td className="px-4 py-3">
                  <AdminToggle userId={p.id} initial={p.is_platform_admin} selfId={ctx.user.id} />
                </td>
              </tr>
            )) ?? null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
