"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { SiteRole } from "@/lib/supabase/types";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "editor", "viewer"]),
});

function requireAdmin(role: SiteRole) {
  if (!hasRole(role, "admin")) {
    throw new Error("Only admins can manage people");
  }
}

export async function inviteMember(siteSlug: string, formData: FormData) {
  const { ctx, site, role } = await requireSiteAccess(siteSlug);
  requireAdmin(role);
  const input = inviteSchema.parse({
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? "editor"),
  });

  const admin = createSupabaseAdminClient();

  // If a profile already exists for this email, just create the membership.
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("site_members")
      .upsert({ site_id: site.id, user_id: existing.id, role: input.role });
    if (error) throw new Error(error.message);
  } else {
    // Send a Supabase Auth invite. The user lands on /auth/callback with a
    // session, then we'll bind the membership in handleInviteAccept.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${appUrl}/auth/callback?next=/${siteSlug}`,
      data: { invited_to_site: site.id, invited_role: input.role },
    });
    if (error) throw new Error(error.message);

    // Pre-create the membership row so the new user lands inside the workspace.
    if (invited.user) {
      await admin
        .from("site_members")
        .upsert({ site_id: site.id, user_id: invited.user.id, role: input.role });
    } else {
      // Track the invite in our table for future bind-on-signup.
      await admin
        .from("invitations")
        .upsert(
          { email: input.email, site_id: site.id, role: input.role, invited_by: ctx.user.id },
          { onConflict: "email,site_id" },
        );
    }
  }

  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "invite",
    entity: "site_members",
    entity_id: input.email,
    diff: { role: input.role },
  });

  revalidatePath(`/${siteSlug}/people`);
}

export async function updateMemberRole(siteSlug: string, userId: string, role: SiteRole) {
  const ctxBundle = await requireSiteAccess(siteSlug);
  requireAdmin(ctxBundle.role);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("site_members")
    .update({ role })
    .eq("site_id", ctxBundle.site.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  await logAudit({
    site_id: ctxBundle.site.id,
    actor_id: ctxBundle.ctx.user.id,
    action: "update_role",
    entity: "site_members",
    entity_id: userId,
    diff: { role },
  });
  revalidatePath(`/${siteSlug}/people`);
}

export async function removeMember(siteSlug: string, userId: string) {
  const ctxBundle = await requireSiteAccess(siteSlug);
  requireAdmin(ctxBundle.role);
  if (userId === ctxBundle.ctx.user.id) {
    throw new Error("You cannot remove yourself");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("site_members")
    .delete()
    .eq("site_id", ctxBundle.site.id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  await logAudit({
    site_id: ctxBundle.site.id,
    actor_id: ctxBundle.ctx.user.id,
    action: "remove",
    entity: "site_members",
    entity_id: userId,
  });
  revalidatePath(`/${siteSlug}/people`);
}
