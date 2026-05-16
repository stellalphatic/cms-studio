import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import type { Profile, Site, SiteRole } from "./supabase/types";

export interface CurrentUserContext {
  user: { id: string; email: string };
  profile: Profile;
  memberships: Array<{ site: Site; role: SiteRole }>;
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) return null;

  const { data: memberships } = await supabase
    .from("site_members")
    .select("role, site:sites(*)")
    .eq("user_id", user.id);

  return {
    user: { id: user.id, email: user.email ?? profile.email },
    profile,
    memberships:
      (memberships as Array<{ role: SiteRole; site: Site }> | null)?.map((m) => ({
        site: m.site,
        role: m.role,
      })) ?? [],
  };
}

export async function requireUser(): Promise<CurrentUserContext> {
  const ctx = await getCurrentUserContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export async function requireSiteAccess(siteSlug: string): Promise<{
  ctx: CurrentUserContext;
  site: Site;
  role: SiteRole;
}> {
  const ctx = await requireUser();
  const m = ctx.memberships.find((mm) => mm.site.slug === siteSlug);
  if (!m) {
    if (ctx.profile.is_platform_admin) {
      const supabase = await createSupabaseServerClient();
      const { data: site } = await supabase
        .from("sites")
        .select("*")
        .eq("slug", siteSlug)
        .single<Site>();
      if (site) return { ctx, site, role: "owner" };
    }
    redirect("/");
  }
  return { ctx, site: m.site, role: m.role };
}

export const ROLE_WEIGHT: Record<SiteRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function hasRole(role: SiteRole, min: SiteRole) {
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[min];
}
