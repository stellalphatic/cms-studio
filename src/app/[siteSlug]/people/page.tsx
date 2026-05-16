import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { formatRelative } from "@/lib/utils";
import type { Profile, SiteRole } from "@/lib/supabase/types";
import { InviteForm } from "./invite-form";
import { MemberRow } from "./member-row";

export const metadata = { title: "People" };

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { ctx, site, role } = await requireSiteAccess(siteSlug);
  const canManage = hasRole(role, "admin");

  const supabase = await createSupabaseServerClient();
  const { data: members } = await supabase
    .from("site_members")
    .select("role, created_at, user:profiles(id, full_name, email, avatar_url)")
    .eq("site_id", site.id);

  const { data: invitations } = canManage
    ? await supabase
        .from("invitations")
        .select("id, email, role, created_at, accepted_at, expires_at")
        .eq("site_id", site.id)
        .is("accepted_at", null)
    : { data: [] };

  type Row = { role: SiteRole; created_at: string; user: Profile };
  const rows = (members as Row[] | null) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <PageHeader title="People" description="Workspace members and their roles." />
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2)] text-left text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Person</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map((m) => (
                <MemberRow
                  key={m.user.id}
                  siteSlug={siteSlug}
                  userId={m.user.id}
                  email={m.user.email}
                  name={m.user.full_name}
                  role={m.role}
                  isSelf={m.user.id === ctx.user.id}
                  joinedAt={m.created_at}
                  canManage={canManage}
                />
              ))}
            </tbody>
          </table>
        </div>

        {canManage && invitations && invitations.length > 0 && (
          <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-2 text-sm font-semibold">Pending invitations</div>
            <ul className="divide-y divide-[var(--color-border)]">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{inv.email}</div>
                    <div className="text-xs text-[var(--color-fg-subtle)] capitalize">
                      {inv.role} · expires {formatRelative(inv.expires_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {canManage && (
        <aside className="space-y-5">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-3 text-sm font-semibold">Invite teammate</div>
            <InviteForm siteSlug={siteSlug} />
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-xs text-[var(--color-fg-muted)] space-y-2">
            <div className="font-semibold text-[var(--color-fg)]">Roles</div>
            <p><strong>Owner</strong> — full control, can transfer ownership.</p>
            <p><strong>Admin</strong> — manages people, settings, and content.</p>
            <p><strong>Editor</strong> — creates and edits content.</p>
            <p><strong>Viewer</strong> — read-only access.</p>
          </div>
        </aside>
      )}
    </div>
  );
}
