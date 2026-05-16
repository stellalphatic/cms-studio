import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireSiteAccess } from "@/lib/auth";
import { getSiteSchema } from "@/lib/schemas";
import { getWhitelabelSite } from "@/lib/host";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { ctx, site, role } = await requireSiteAccess(siteSlug);
  const schema = getSiteSchema(siteSlug);
  const whitelabel = await getWhitelabelSite();

  // Whitelabel guard: if this request came in on a custom CMS subdomain
  // (e.g. cms.searchhub.digital), refuse to render any workspace other than
  // that site's. Sends them back to "/" which the middleware then re-pins
  // to their workspace.
  if (whitelabel && whitelabel.slug !== siteSlug) {
    redirect("/");
  }

  // On whitelabel hosts, hide every other workspace from the switcher so
  // clients only ever see their own brand.
  const visibleMemberships = whitelabel
    ? ctx.memberships.filter((m) => m.site.slug === whitelabel.slug)
    : ctx.memberships;

  const themeStyle = site.brand?.primary
    ? ({ "--color-brand": site.brand.primary } as React.CSSProperties)
    : undefined;

  return (
    <div className="min-h-svh bg-[var(--color-bg)]" style={themeStyle}>
      <div className="grid min-h-svh grid-cols-[260px_1fr]">
        <Sidebar site={site} schema={schema} role={role} />
        <div className="flex min-w-0 flex-col">
          <Topbar
            site={site}
            role={role}
            user={{ email: ctx.user.email, fullName: ctx.profile.full_name }}
            allMemberships={visibleMemberships}
            isWhitelabel={Boolean(whitelabel)}
          />
          <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
