import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { TestimonialsManager, type TestimonialRow } from "./testimonials-manager";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site, role } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("testimonials")
    .select("id, author_name, author_role, quote, avatar_url, weight, is_published")
    .eq("site_id", site.id)
    .order("weight", { ascending: false })
    .order("author_name", { ascending: true });

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Testimonials"
        description="Quotes that you can surface anywhere on the site."
      />
      <TestimonialsManager
        siteSlug={siteSlug}
        rows={(data as TestimonialRow[] | null) ?? []}
        canEdit={hasRole(role, "editor")}
      />
    </div>
  );
}
