// Supabase Edge Function: publish-scheduled
//
// Run on a 1-minute cron. Promotes scheduled rows whose scheduled_for has
// passed to status='published' (and sets published_at). The update trigger
// on each content table then enqueues a build job, which dispatch-builds
// flushes to Amplify.

// deno-lint-ignore-file
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Only blog_posts currently carries `scheduled_for`. Adding the column to
// other content tables in a future migration will auto-include them here.
const TABLES = ["blog_posts"] as const;

Deno.serve(async () => {
  const now = new Date().toISOString();
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const { data, error } = await sb
      .from(table)
      .update({ status: "published", published_at: now })
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .select("id");
    if (error) {
      console.warn(`[publish-scheduled] ${table}: ${error.message}`);
      counts[table] = -1;
      continue;
    }
    counts[table] = data?.length ?? 0;
  }

  return Response.json({ promoted: counts });
});
