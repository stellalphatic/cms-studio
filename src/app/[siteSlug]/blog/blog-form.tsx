"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { RichEditor } from "@/components/editor/rich-editor";
import { uploadMedia } from "@/lib/media-upload";
import { slugify } from "@/lib/utils";
import type { BlogPost, ContentStatus } from "@/lib/supabase/types";

interface Props {
  siteSlug: string;
  siteId: string;
  initial?: Partial<BlogPost>;
  customFields?: Array<{ key: string; label: string; type: string; help?: string }>;
  onSubmit: (formData: FormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function BlogForm({ siteSlug, siteId, initial, customFields, onSubmit, onDelete }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [body, setBody] = useState(initial?.body_html ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [status, setStatus] = useState<ContentStatus>(initial?.status ?? "draft");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [coverUploading, setCoverUploading] = useState(false);
  const [seoTitle, setSeoTitle] = useState(((initial?.seo as Record<string, string>)?.title as string) ?? "");
  const [seoDesc, setSeoDesc] = useState(((initial?.seo as Record<string, string>)?.description as string) ?? "");
  const [customJson, setCustomJson] = useState(
    JSON.stringify(initial?.custom_fields ?? {}, null, 2),
  );

  const titleChanged = (next: string) => {
    setTitle(next);
    if (!initial?.id) setSlug(slugify(next));
  };

  async function handleCoverFile(file: File) {
    setCoverUploading(true);
    const url = await uploadMedia({ file, siteId });
    setCoverUploading(false);
    if (url) setCoverUrl(url);
  }

  function submit(formData: FormData) {
    formData.set("title", title);
    formData.set("slug", slug || slugify(title));
    formData.set("body_html", body);
    formData.set("cover_url", coverUrl ?? "");
    formData.set("status", status);
    formData.set("excerpt", excerpt ?? "");
    formData.set("category", category ?? "");
    formData.set("tags", tags);
    formData.set("seo_title", seoTitle);
    formData.set("seo_description", seoDesc);
    formData.set("custom_fields", customJson);
    start(async () => {
      try {
        await onSubmit(formData);
        toast.success(initial?.id ? "Saved" : "Created");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <form action={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
          <Field label="Title" required>
            <Input value={title} onChange={(e) => titleChanged(e.target.value)} placeholder="A clear, search-friendly headline" />
          </Field>
          <Field label="Slug" hint="Lowercase, hyphenated. Used in the URL.">
            <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="my-post-slug" />
          </Field>
          <Field label="Excerpt" hint="One or two sentences shown on cards & social previews.">
            <Textarea value={excerpt ?? ""} onChange={(e) => setExcerpt(e.target.value)} rows={3} maxLength={400} />
          </Field>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="mb-2 text-sm font-medium">Body</div>
          <RichEditor value={body} onChange={setBody} siteId={siteId} placeholder="Start writing…" />
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
          <div className="text-sm font-semibold">SEO</div>
          <Field label="Meta title" hint="Defaults to the post title.">
            <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={160} />
          </Field>
          <Field label="Meta description">
            <Textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} maxLength={320} />
          </Field>
        </div>

        {customFields && customFields.length > 0 && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
            <div className="text-sm font-semibold">Site-specific fields</div>
            <Field label="Custom fields (JSON)" hint="Edit as JSON for now. A typed UI lands in Phase 5.">
              <Textarea
                value={customJson}
                onChange={(e) => setCustomJson(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
            </Field>
            <ul className="text-xs text-[var(--color-fg-muted)]">
              {customFields.map((f) => (
                <li key={f.key}>
                  <code className="font-mono">{f.key}</code> — {f.label}
                  {f.help && <span className="text-[var(--color-fg-subtle)]"> · {f.help}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : status === "published" ? "Publish" : "Save"}
          </Button>
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                if (!confirm("Delete this post? This cannot be undone.")) return;
                start(async () => {
                  try {
                    await onDelete();
                    toast.success("Deleted");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Delete failed");
                  }
                });
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-sm text-[var(--color-danger)] transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
          <div className="text-sm font-semibold">Cover image</div>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="aspect-[16/10] w-full rounded-md object-cover" />
          ) : (
            <div className="grid aspect-[16/10] place-items-center rounded-md border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)] text-[var(--color-fg-subtle)]">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
          <label className="block">
            <span className="sr-only">Upload cover</span>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-xs text-[var(--color-fg-muted)] file:mr-2 file:rounded-md file:border file:border-[var(--color-border-strong)] file:bg-white file:px-2 file:py-1 file:text-xs file:font-medium"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleCoverFile(f);
              }}
            />
          </label>
          {coverUploading && <div className="text-xs text-[var(--color-fg-subtle)]">Uploading…</div>}
          <Field label="Cover URL">
            <Input value={coverUrl ?? ""} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
          <Field label="Category">
            <Input value={category ?? ""} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. SEO" />
          </Field>
          <Field label="Tags" hint="Comma separated">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="seo, ai, growth" />
          </Field>
        </div>
      </aside>
    </form>
  );
}
