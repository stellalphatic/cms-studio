"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SubmissionStatus } from "@/lib/supabase/types";
import { logAudit } from "@/lib/audit";

export async function updateSubmission(
  siteSlug: string,
  id: string,
  patch: { status?: SubmissionStatus; assigned_to?: string | null; notes?: string },
) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("form_submissions")
    .update(patch)
    .eq("id", id)
    .eq("site_id", site.id);
  if (error) throw new Error(error.message);

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "update",
    entity: "form_submissions",
    entity_id: id,
    diff: patch as Record<string, unknown>,
  });

  revalidatePath(`/${siteSlug}/forms`);
  revalidatePath(`/${siteSlug}/forms/${id}`);
}

export async function deleteSubmission(siteSlug: string, id: string) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("form_submissions")
    .delete()
    .eq("id", id)
    .eq("site_id", site.id);
  if (error) throw new Error(error.message);
  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "delete",
    entity: "form_submissions",
    entity_id: id,
  });
  revalidatePath(`/${siteSlug}/forms`);
  redirect(`/${siteSlug}/forms`);
}
