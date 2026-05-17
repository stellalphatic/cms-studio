"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Section } from "@/components/ui/surface";
import { RichEditor } from "@/components/editor/rich-editor";
import { slugify } from "@/lib/utils";

export interface PageInitial {
  id?: string;
  title?: string;
  slug?: string;
  body_html?: string;
  status?: "draft" | "scheduled" | "published" | "archived";
  seo?: Record<string, unknown>;
}

export function PageForm({
  siteSlug: _siteSlug,
  siteId,
  initial,
  onSubmit,
  onDelete,
}: {
  siteSlug: string;
  siteId: string;
  initial?: PageInitial;
  onSubmit: (fd: FormData) => Promise<void | { id?: string }>;
  onDelete?: () => Promise<void>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [body, setBody] = useState(initial?.body_html ?? "");
  const [status, setStatus] = useState(initial?.status ?? "draft");
  const [seoTitle, setSeoTitle] = useState(((initial?.seo as Record<string, string>)?.title as string) ?? "");
  const [seoDesc, setSeoDesc] = useState(
    ((initial?.seo as Record<string, string>)?.description as string) ?? "",
  );

  function titleChanged(next: string) {
    setTitle(next);
    if (!initial?.id) setSlug(slugify(next));
  }

  function submit(fd: FormData) {
    fd.set("title", title);
    fd.set("slug", slug || slugify(title));
    fd.set("body_html", body);
    fd.set("status", status);
    fd.set("seo_title", seoTitle);
    fd.set("seo_description", seoDesc);
    start(async () => {
      try {
        const result = await onSubmit(fd);
        toast.success(initial?.id ? "Saved" : "Created");
        if (result && "id" in result && result.id && !initial?.id) {
          router.push(`/${_siteSlug}/pages/${result.id}?created=1`);
        } else {
          router.refresh();
        }
      } catch (e) {
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
    <form action={submit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="editor-canvas">
          <textarea
            value={title}
            onChange={(e) => titleChanged(e.target.value)}
            placeholder="Page title"
            rows={1}
            className="editor-title"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }}
          />
          <div className="mt-6">
            <RichEditor value={body} onChange={setBody} siteId={siteId} bare />
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <div className="space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <Section title="Publish">
            <div className="space-y-3">
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
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
                    if (!confirm("Delete this page?")) return;
                    start(async () => {
                      try {
                        await onDelete();
                        toast.success("Deleted");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Delete failed");
                      }
                    });
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete page
                </button>
              )}
            </div>
          </Section>

          <Section title="Slug">
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="font-mono text-[12px]"
              placeholder="about"
            />
          </Section>

          <Section title="SEO">
            <div className="space-y-3">
              <Field label="Meta title">
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || "Defaults to title"}
                />
              </Field>
              <Field label="Meta description">
                <Textarea
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  rows={3}
                  placeholder="One or two sentences that earn the click."
                />
              </Field>
            </div>
          </Section>
        </div>
      </aside>
    </form>
  );
}
