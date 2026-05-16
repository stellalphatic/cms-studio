import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Media" };

export default async function MediaPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();

  const { data: media } = await supabase
    .from("media")
    .select("id, public_url, alt, mime_type, file_size_bytes, created_at")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(120);

  return (
    <div>
      <PageHeader
        title="Media"
        description="Every image you upload via the editor lands here. Drag-and-drop manager lands in Phase 5."
      />
      {(media?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center text-sm text-[var(--color-fg-muted)]">
          Nothing here yet. Use the image button in the editor to upload.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {media!.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.public_url} alt={m.alt ?? ""} className="aspect-square w-full object-cover" />
              <div className="px-2 py-1.5 text-[11px] text-[var(--color-fg-muted)]">
                {formatRelative(m.created_at)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
