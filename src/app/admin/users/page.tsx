import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { AdminToggle } from "./admin-toggle";
import { PlatformInviteForm } from "./invite-form";

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_platform_admin: boolean;
  created_at: string;
}

interface MembershipRow {
  user_id: string;
  role: string;
  site: { slug: string; name: string } | { slug: string; name: string }[] | null;
}

export default async function AdminUsersPage() {
  const ctx = await requireUser();
  const sb = createSupabaseAdminClient();
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, email, full_name, avatar_url, is_platform_admin, created_at")
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
    <div className="space-y-8">
      <PageHeader
        title="People"
        description="Every user across the platform. Promote teammates to platform admin to give them super-admin powers (see every site, create new ones, manage API keys)."
        eyebrow="Admin"
      />

      <PlatformInviteForm />

      <DataTable>
        <THead>
          <TR>
            <TH>User</TH>
            <TH>Workspaces</TH>
            <TH align="right">Joined</TH>
            <TH align="right">Platform admin</TH>
          </TR>
        </THead>
        <TBody>
          {(profiles as ProfileRow[] | null)?.map((p) => {
            const mems = memberMap.get(p.id) ?? [];
            const initial = (p.full_name ?? p.email).charAt(0).toUpperCase();
            return (
              <TR key={p.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-[var(--color-border)]"
                      />
                    ) : (
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface-2)] text-[11px] font-semibold text-[var(--color-fg-muted)]">
                        {initial}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium">
                        {p.full_name ?? p.email.split("@")[0]}
                        {p.is_platform_admin && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-50)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-brand)]">
                            <ShieldCheck className="h-2.5 w-2.5" /> Admin
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--color-fg-subtle)]">
                        {p.email}
                      </div>
                    </div>
                  </div>
                </TD>
                <TD>
                  {mems.length === 0 ? (
                    <span className="text-[var(--color-fg-subtle)]">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {mems.map((m) => (
                        <span
                          key={m.slug + m.role}
                          className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px]"
                        >
                          <span className="font-medium">{m.name}</span>
                          <span className="font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
                            {m.role}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </TD>
                <TD muted align="right" mono>
                  {formatDate(p.created_at)}
                </TD>
                <TD align="right">
                  <AdminToggle userId={p.id} initial={p.is_platform_admin} selfId={ctx.user.id} />
                </TD>
              </TR>
            );
          }) ?? null}
        </TBody>
      </DataTable>
    </div>
  );
}
