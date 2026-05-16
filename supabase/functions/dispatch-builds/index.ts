// Supabase Edge Function: dispatch-builds
// Run on a 1-minute cron (`supabase functions schedule`) to flush queued
// build jobs whose scheduled_for has passed. Sends a POST to each site's
// amplify_webhook_url. Coalesces multiple jobs for the same site so a flurry
// of edits triggers a single rebuild.

// deno-lint-ignore-file
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async () => {
  const { data: pending, error } = await supabase
    .from("build_jobs")
    .select("id, site_id, trigger, scheduled_for, sites:sites!inner(amplify_webhook_url, slug)")
    .eq("status", "queued")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true });

  if (error) return new Response(`db error: ${error.message}`, { status: 500 });

  if (!pending || pending.length === 0) {
    return Response.json({ dispatched: 0 });
  }

  // Coalesce by site
  const bySite = new Map<string, typeof pending>();
  for (const job of pending) {
    const arr = bySite.get(job.site_id) ?? [];
    arr.push(job);
    bySite.set(job.site_id, arr);
  }

  let dispatched = 0;
  for (const [siteId, jobs] of bySite) {
    const url = (jobs[0] as any).sites?.amplify_webhook_url as string | null;
    const ids = jobs.map((j) => j.id);

    if (!url) {
      await supabase.from("build_jobs").update({ status: "skipped", error: "no webhook" }).in("id", ids);
      continue;
    }

    try {
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
      await supabase
        .from("build_jobs")
        .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
        .in("id", ids);
      dispatched += jobs.length;
    } catch (e) {
      await supabase
        .from("build_jobs")
        .update({ status: "failed", error: String(e) })
        .in("id", ids);
    }
  }

  return Response.json({ dispatched, sites: bySite.size });
});
