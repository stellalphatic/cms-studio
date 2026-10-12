"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function updateWebinarNotes(
  siteSlug: string,
  id: string,
  notes: string,
) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("webinar_registrations")
    .update({ notes })
    .eq("id", id)
    .eq("site_id", site.id);
  if (error) throw new Error(error.message);

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "update",
    entity: "webinar_registrations",
    entity_id: id,
    diff: { notes },
  });

  revalidatePath(`/${siteSlug}/webinar`);
  revalidatePath(`/${siteSlug}/webinar/${id}`);
}
