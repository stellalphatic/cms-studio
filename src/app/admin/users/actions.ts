"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  full_name: z.string().max(120).optional().nullable(),
  is_platform_admin: z.boolean().default(false),
});

/**
 * Platform-level invite. Creates a Supabase Auth user (or reuses an existing
 * one) and optionally flags them as platform admin. Use when adding a new
 * teammate who should have visibility across every site without going
 * site-by-site to grant memberships.
 *
 * If the email is already a profile, this is a no-op for the profile row
 * and just flips the admin flag if requested.
 */
export async function invitePlatformUser(formData: FormData) {
  const ctx = await requireUser();
  if (!ctx.profile.is_platform_admin) throw new Error("Forbidden");

  const input = inviteSchema.parse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    full_name: String(formData.get("full_name") ?? "") || null,
    is_platform_admin: formData.get("is_platform_admin") === "on",
  });

  const admin = createSupabaseAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";

  // Reuse existing profile if present, else send an Auth invite email.
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();

  let userId = existing?.id ?? null;

  if (!userId) {
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${appUrl}/auth/callback?next=/workspaces`,
      data: { full_name: input.full_name ?? undefined },
    });
    if (error) throw new Error(error.message);
    userId = invited.user?.id ?? null;
  }

  if (userId && input.is_platform_admin) {
    const { error: upErr } = await admin
      .from("profiles")
      .update({ is_platform_admin: true })
      .eq("id", userId);
    if (upErr) throw new Error(upErr.message);
  }

  await logAudit({
    site_id: null,
    actor_id: ctx.user.id,
    action: "platform_invite",
    entity: "profile",
    entity_id: userId ?? input.email,
    diff: { email: input.email, is_platform_admin: input.is_platform_admin },
  });

  revalidatePath("/admin/users");
}

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
