"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function setPlatformAdmin(userId: string, value: boolean) {
  const ctx = await requireUser();
  if (!ctx.profile.is_platform_admin) throw new Error("Forbidden");
  if (userId === ctx.user.id && !value) {
    throw new Error("You cannot remove platform-admin from yourself.");
  }
  const sb = createSupabaseAdminClient();
  const { error } = await sb.from("profiles").update({ is_platform_admin: value }).eq("id", userId);
  if (error) throw new Error(error.message);

  await logAudit({
    site_id: null,
    actor_id: ctx.user.id,
    action: value ? "promote" : "demote",
    entity: "profile",
    entity_id: userId,
  });

  revalidatePath("/admin/users");
}
