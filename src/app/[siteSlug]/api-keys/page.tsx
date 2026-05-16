import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/lib/utils";
import { CreateApiKey } from "./create-key";
import { RevokeButton } from "./revoke-button";
import type { ApiKey } from "@/lib/supabase/types";

export const metadata = { title: "API Keys" };

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug);
  const canEdit = hasRole(role, "admin");

  const sb = await createSupabaseServerClient();
  const { data: keys } = await sb
    .from("api_keys")
    .select("id, name, prefix, scopes, created_at, last_used_at, expires_at, revoked_at")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false });

  const apiBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="API Keys"
        description="Issue read-only API keys for sites or apps consuming this workspace via the public API."
      />

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5 text-sm">
        <div className="font-semibold mb-2">Endpoint</div>
        <code className="block rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-2 font-mono text-xs break-all">
          {apiBase || "https://your-studio.example.com"}/api/v1/sites/{site.slug}
        </code>
        <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
          When at least one un-revoked key exists, the public API requires
          <code className="mx-1 rounded bg-[var(--color-bg)] px-1 py-0.5">Authorization: Bearer &lt;key&gt;</code>.
          With zero keys it is fully public read-only — useful while bootstrapping.
        </p>
      </div>

      {canEdit && <CreateApiKey siteSlug={site.slug} />}

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg)] text-left text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Prefix</th>
              <th className="px-4 py-3 font-medium">Last used</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {(keys as ApiKey[] | null)?.length ? (
              (keys as ApiKey[]).map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{k.prefix}…</td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">
                    {k.last_used_at ? formatDate(k.last_used_at) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-fg-muted)]">
                    {k.expires_at ? formatDate(k.expires_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {k.revoked_at ? (
                      <span className="rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5 text-xs">
                        Revoked
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && !k.revoked_at && (
                      <RevokeButton siteSlug={site.slug} id={k.id} />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-fg-muted)]">
                  No API keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
