import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireSiteAccess } from "@/lib/auth";
import { getSiteSchema } from "@/lib/schemas";

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

  // Per-workspace branding: rebind --color-brand to the site's primary so
  // every UI primitive that uses the brand variable picks up the theme.
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
            allMemberships={ctx.memberships}
          />
          <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
