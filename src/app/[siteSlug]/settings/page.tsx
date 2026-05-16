import { hasRole, requireSiteAccess } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug);
  const canEdit = hasRole(role, "admin");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Settings"
        description="Branding, build webhook, per-site email, public API origins, and custom CMS subdomain."
      />
      <SettingsForm site={site} canEdit={canEdit} />
    </div>
  );
}
