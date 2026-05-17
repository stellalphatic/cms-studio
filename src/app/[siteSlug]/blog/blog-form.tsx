"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Calendar,
  ChevronDown,
  Loader2,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Section } from "@/components/ui/surface";
import { MediaPicker } from "@/components/ui/media-picker";
import { AuthorPicker, type AuthorOption } from "@/components/ui/author-picker";
import { RichEditor } from "@/components/editor/rich-editor";
import { cn, slugify } from "@/lib/utils";
import type { BlogPost, ContentStatus } from "@/lib/supabase/types";

interface Props {
  siteSlug: string;
  siteId: string;
  initial?: Partial<BlogPost>;
  customFields?: Array<{ key: string; label: string; type: string; help?: string }>;
  authors: AuthorOption[];
  initialAuthor?: { name: string; avatarUrl: string | null };
  /**
   * Server action. May return `{ redirectTo }` if it wants the client to
   * navigate after success (preferred over `redirect()` from the action, which
   * can leak a NEXT_REDIRECT toast through useTransition).
   */
  onSubmit: (formData: FormData) => Promise<void | { redirectTo?: string }>;
  onDelete?: () => Promise<void>;
}

const SEO_TITLE_MAX = 60;
const SEO_DESC_MAX = 160;

/** ISO → "2025-05-17T14:30" for <input type="datetime-local"> */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BlogForm({
  siteSlug: _siteSlug,
  siteId,
  initial,
  customFields,
  authors,
  initialAuthor,
  onSubmit,
  onDelete,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [body, setBody] = useState(initial?.body_html ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");
  const [coverAlt, setCoverAlt] = useState(initial?.cover_alt ?? "");
  const [status, setStatus] = useState<ContentStatus>(initial?.status ?? "draft");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [publishedAt, setPublishedAt] = useState(toLocalInput(initial?.published_at));
  const [seoTitle, setSeoTitle] = useState(((initial?.seo as Record<string, string>)?.title as string) ?? "");
  const [seoDesc, setSeoDesc] = useState(((initial?.seo as Record<string, string>)?.description as string) ?? "");
  const [customJson, setCustomJson] = useState(
    JSON.stringify(initial?.custom_fields ?? {}, null, 2),
  );

  const wordCount = (body.replace(/<[^>]*>/g, " ").match(/\b\w+\b/g) ?? []).length;
  const readingTime = Math.max(1, Math.round(wordCount / 230));

  const titleChanged = (next: string) => {
    setTitle(next);
    if (!initial?.id) setSlug(slugify(next));
  };

  function submit(formData: FormData) {
    formData.set("title", title);
    formData.set("slug", slug || slugify(title));
    formData.set("body_html", body);
    formData.set("cover_url", coverUrl ?? "");
    formData.set("cover_alt", coverAlt ?? "");
    formData.set("status", status);
    formData.set("excerpt", excerpt ?? "");
    formData.set("category", category ?? "");
    formData.set("tags", tags);
    formData.set("published_at", publishedAt);
    formData.set("seo_title", seoTitle);
    formData.set("seo_description", seoDesc);
    formData.set("custom_fields", customJson);
    // author_name + author_avatar_url come from AuthorPicker's named inputs
    start(async () => {
      try {
        const result = await onSubmit(formData);
        toast.success(initial?.id ? "Saved" : "Created");
        if (result && "redirectTo" in result && result.redirectTo) {
          router.push(result.redirectTo);
        } else {
          router.refresh();
        }
      } catch (e) {
        // Suppress NEXT_REDIRECT / NEXT_NOT_FOUND — those are framework
        // signals that occur during a successful redirect, not real errors.
        const digest = (e as { digest?: string })?.digest;
        const message = e instanceof Error ? e.message : String(e);
        if (
          message === "NEXT_REDIRECT" ||
          message === "NEXT_NOT_FOUND" ||
          (typeof digest === "string" && digest.startsWith("NEXT_"))
        ) {
          return;
        }
        toast.error(message || "Save failed");
      }
    });
  }

  return (
    <form action={submit} className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* CANVAS — the editorial focus area */}
      <div className="min-w-0">
        <div className="editor-canvas">
          <div className="mb-6 flex flex-wrap items-center gap-2 font-mono text-[11.5px] text-[var(--color-fg-subtle)]">
            <span>/{slug || "post-slug"}</span>
            <span aria-hidden>·</span>
            <span className="tabular">{wordCount} words</span>
            <span aria-hidden>·</span>
            <span>{readingTime} min read</span>
          </div>

          <TitleInput value={title} onChange={titleChanged} />

          <div className="mt-3">
            <input
              type="text"
              value={excerpt ?? ""}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={400}
              placeholder="A short subtitle, or what makes this post worth reading."
              className="w-full border-0 bg-transparent p-0 text-[18px] leading-snug text-[var(--color-fg-muted)] outline-none placeholder:italic placeholder:text-[var(--color-fg-subtle)] focus:ring-0"
              style={{ fontFamily: "var(--font-serif), serif" }}
            />
          </div>

          {coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={coverAlt ?? ""}
              className="mt-8 aspect-[2/1] w-full rounded-lg object-cover ring-1 ring-[var(--color-border)]"
            />
          )}

          <div className="mt-6">
            <RichEditor value={body} onChange={setBody} siteId={siteId} bare />
          </div>

          <Disclosure label="SEO" hint="Search engines and social previews" defaultOpen={Boolean(seoTitle || seoDesc)}>
            <div className="space-y-4 pt-2">
              <Field label="Meta title" hint={`${seoTitle.length} / ${SEO_TITLE_MAX}`}>
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  maxLength={SEO_TITLE_MAX + 20}
                  placeholder={title || "Defaults to the post title"}
                />
              </Field>
              <Field label="Meta description" hint={`${seoDesc.length} / ${SEO_DESC_MAX}`}>
                <Textarea
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  rows={2}
                  maxLength={SEO_DESC_MAX + 40}
                  placeholder={excerpt || "Two sentences that earn the click."}
                />
              </Field>
              <SearchPreview
                title={seoTitle || title}
                description={seoDesc || excerpt || ""}
                slug={slug}
              />
            </div>
          </Disclosure>

          {customFields && customFields.length > 0 && (
            <Disclosure label="Site-specific fields" hint="Custom schema for this site">
              <div className="space-y-3 pt-2">
                <Field label="Custom fields (JSON)" hint="A typed UI lands in Phase 5.">
                  <Textarea
                    value={customJson}
                    onChange={(e) => setCustomJson(e.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </Field>
                <ul className="space-y-1 text-xs text-[var(--color-fg-muted)]">
                  {customFields.map((f) => (
                    <li key={f.key}>
                      <code className="font-mono text-[var(--color-fg)]">{f.key}</code>{" "}
                      <span className="text-[var(--color-fg-subtle)]">·</span> {f.label}
                      {f.help && <span className="text-[var(--color-fg-subtle)]"> · {f.help}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </Disclosure>
          )}
        </div>
      </div>

      {/* RAIL — sticky publish + meta */}
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <div className="space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <Section title="Publish">
            <div className="space-y-3">
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
              <Field
                label="Publish date"
                hint={publishedAt ? "Will display this date" : "Auto-set on publish"}
              >
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 pr-8 text-sm text-[var(--color-fg)] transition hover:border-[var(--color-border-strong)] focus-visible:border-[var(--color-brand)]"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-fg-subtle)]" />
                </div>
              </Field>
              <Button type="submit" size="lg" disabled={pending} className="w-full">
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : status === "published" ? (
                  "Publish"
                ) : (
                  "Save draft"
                )}
              </Button>
              {onDelete && initial?.id && (
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
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-[var(--color-fg-subtle)] transition hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete post
                </button>
              )}
            </div>
          </Section>

          <Section title="Authorship">
            <AuthorPicker
              authors={authors}
              initialName={initialAuthor?.name ?? ""}
              initialAvatarUrl={initialAuthor?.avatarUrl ?? ""}
            />
          </Section>

          <Section title="Slug">
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="font-mono text-[12px]"
              placeholder="my-post-slug"
            />
          </Section>

          <Section title="Cover image">
            <MediaPicker value={coverUrl ?? ""} onChange={setCoverUrl} siteId={siteId} aspect="16/10" />
            {coverUrl && (
              <div className="mt-3">
                <Field label="Alt text" hint="Describes the image for screen readers and SEO">
                  <Input
                    value={coverAlt ?? ""}
                    onChange={(e) => setCoverAlt(e.target.value)}
                    placeholder="A close-up of a typewriter"
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Filing">
            <div className="space-y-3">
              <Field label="Category">
                <Input
                  value={category ?? ""}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. SEO"
                />
              </Field>
              <Field label="Tags" hint="Comma separated">
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="seo, ai, growth"
                />
              </Field>
            </div>
          </Section>
        </div>
      </aside>
    </form>
  );
}

function TitleInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="A clear, search-friendly headline"
      rows={1}
      className="editor-title"
      onInput={(e) => {
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
      }}
    />
  );
}

function Disclosure({
  label,
  hint,
  children,
  defaultOpen,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="mt-12 border-t border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center justify-between py-4 text-left"
      >
        <span className="flex items-center gap-2">
          <Settings2 className="h-3.5 w-3.5 text-[var(--color-fg-subtle)]" />
          <span className="text-[13px] font-medium tracking-tight text-[var(--color-fg)]">{label}</span>
          {hint && (
            <span className="text-[12px] font-normal text-[var(--color-fg-subtle)]">· {hint}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--color-fg-subtle)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="pb-6">{children}</div>}
    </div>
  );
}

function SearchPreview({
  title,
  description,
  slug,
}: {
  title: string;
  description: string;
  slug: string;
}) {
  if (!title && !description) return null;
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
        Google preview
      </div>
      <div className="truncate text-[12px] text-emerald-700 dark:text-emerald-400">
        yoursite.com<span className="text-[var(--color-fg-subtle)]"> › </span>blog
        <span className="text-[var(--color-fg-subtle)]"> › </span>
        {slug || "post"}
      </div>
      <div className="mt-1 truncate text-[18px] leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">
        {title || "(untitled)"}
      </div>
      <div className="mt-1 line-clamp-2 text-[13px] text-[var(--color-fg-muted)]">
        {description || "Add a meta description to control what appears here."}
      </div>
    </div>
  );
}
