import { KeyRound } from "lucide-react";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Empty } from "@/components/ui/surface";
import { formatDate } from "@/lib/utils";
import { CreateApiKey } from "./create-key";
import { RevokeButton } from "./revoke-button";
import type { ApiKey } from "@/lib/supabase/types";

export const metadata = { title: "API keys" };

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
  const list = (keys as ApiKey[] | null) ?? [];

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title="API keys"
        description="Issue read-only keys for sites and apps consuming this workspace via the public API."
      />

      {/* Endpoint reference — terminal-feel, not a tip card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            Endpoint
          </div>
        </div>
        <div className="px-5 py-4">
          <code className="block break-all rounded-md bg-[var(--color-fg)] px-3 py-2.5 font-mono text-[12px] text-[var(--color-bg)]">
            <span className="opacity-50">GET </span>
            {apiBase || "https://your-studio.example.com"}/api/v1/sites/{site.slug}
          </code>
          <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">
            When at least one un-revoked key exists, the public API requires
            {" "}
            <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 font-mono text-[11px]">
              Authorization: Bearer &lt;key&gt;
            </code>
            . With zero keys it is fully public read-only, useful while bootstrapping.
          </p>
        </div>
      </div>

      {canEdit && <CreateApiKey siteSlug={site.slug} />}

      {list.length > 0 ? (
        <DataTable>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Prefix</TH>
              <TH align="right">Last used</TH>
              <TH align="right">Expires</TH>
              <TH>Status</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {list.map((k) => (
              <TR key={k.id}>
                <TD>
                  <span className="text-[13.5px] font-medium">{k.name}</span>
                </TD>
                <TD mono>{k.prefix}…</TD>
                <TD muted align="right" mono>
                  {k.last_used_at ? formatDate(k.last_used_at) : "Never"}
                </TD>
                <TD muted align="right" mono>
                  {k.expires_at ? formatDate(k.expires_at) : "—"}
                </TD>
                <TD>
                  {k.revoked_at ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tone-bad-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--tone-bad-fg)]">
                      Revoked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tone-pub-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--tone-pub-fg)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      Active
                    </span>
                  )}
                </TD>
                <TD align="right">
                  {canEdit && !k.revoked_at && <RevokeButton siteSlug={site.slug} id={k.id} />}
                </TD>
              </TR>
            ))}
          </TBody>
        </DataTable>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Empty
            icon={KeyRound}
            title="No API keys yet"
            hint="Issue your first key above. Keys are shown once, then hashed at rest."
          />
        </div>
      )}
    </div>
  );
}
