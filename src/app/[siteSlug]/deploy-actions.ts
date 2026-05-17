"use server";

import { revalidatePath } from "next/cache";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { withAction } from "@/lib/action-error";

export interface DeployResult {
  ok: boolean;
  dispatched: number;
  status?: number;
  message?: string;
}

/**
 * Fire the site's build webhook (Amplify / Vercel / Netlify / Cloudflare /
 * Render — anything that exposes a POST-able deploy hook) and mark every
 * queued build_job for this site as dispatched. Coalesces a burst of edits
 * into one rebuild.
 *
 * Editors+ can trigger this; viewers cannot. Returns a structured result
 * so the topbar can show a real success/error toast instead of a generic
 * "fire and forget" message.
 */
export async function dispatchBuild(siteSlug: string): Promise<DeployResult> {
  return withAction("dispatchBuild", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    if (!hasRole(role, "editor")) {
      return { ok: false, dispatched: 0, message: "Only editors can deploy" };
    }
    if (!site.amplify_webhook_url) {
      return {
        ok: false,
        dispatched: 0,
        message:
          "No deploy hook configured. Add one in Settings → Build webhook (works with Amplify, Vercel, Netlify, Cloudflare, Render).",
      };
    }

    const supabase = await createSupabaseServerClient();
    const { data: pending } = await supabase
      .from("build_jobs")
      .select("id")
      .eq("site_id", site.id)
      .eq("status", "queued");
    const pendingIds = (pending ?? []).map((r) => r.id);

    let status = 0;
    let okResp = false;
    try {
      const res = await fetch(site.amplify_webhook_url, {
        method: "POST",
        // Most hooks accept empty body, but some prefer JSON. Send both.
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "studio", triggered_by: ctx.user.id }),
      });
      status = res.status;
      okResp = res.ok;
    } catch (e) {
      return {
        ok: false,
        dispatched: 0,
        message: `Deploy hook unreachable: ${(e as Error).message}`,
      };
    }

    if (!okResp) {
      // Mark the jobs as failed so we don't double-dispatch.
      if (pendingIds.length) {
        await supabase
          .from("build_jobs")
          .update({ status: "failed", error: `webhook ${status}` })
          .in("id", pendingIds);
      }
      return {
        ok: false,
        dispatched: 0,
        status,
        message: `Deploy hook returned HTTP ${status}. Check the URL in Settings.`,
      };
    }

    if (pendingIds.length) {
      await supabase
        .from("build_jobs")
        .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
        .in("id", pendingIds);
    } else {
      // Manual deploy with nothing queued — record it so the audit log shows it.
      await supabase.from("build_jobs").insert({
        site_id: site.id,
        trigger: "manual",
        status: "dispatched",
        scheduled_for: new Date().toISOString(),
        dispatched_at: new Date().toISOString(),
      });
    }

    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "deploy",
      entity: "sites",
      entity_id: site.id,
      diff: { dispatched: pendingIds.length || 1, status },
    });

    revalidatePath(`/${siteSlug}`, "layout");
    return { ok: true, dispatched: pendingIds.length || 1, status };
  });
}
