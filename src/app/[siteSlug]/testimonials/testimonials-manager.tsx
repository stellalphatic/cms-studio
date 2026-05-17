"use client";

import { useState, useTransition } from "react";
import { EyeOff, Plus, Quote, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { createTestimonial, deleteTestimonial, updateTestimonial } from "./actions";

export interface TestimonialRow {
  id: string;
  author_name: string;
  author_role: string | null;
  quote: string;
  avatar_url: string | null;
  weight: number;
  is_published: boolean;
}

export function TestimonialsManager({
  siteSlug,
  rows,
  canEdit,
}: {
  siteSlug: string;
  rows: TestimonialRow[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<TestimonialRow | "new" | null>(null);

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[var(--color-fg-muted)]">
            {rows.length} {rows.length === 1 ? "quote" : "quotes"} · Higher weight surfaces first.
          </p>
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> New testimonial
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center">
          <Quote className="mx-auto h-5 w-5 text-[var(--color-fg-subtle)]" />
          <p className="mt-3 text-[14px] font-medium">No testimonials yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--color-fg-muted)]">
            Add a few customer quotes — they ship to the site and weight controls the order.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((t) => (
            <article
              key={t.id}
              className="group relative flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-border-strong)]"
            >
              <Quote className="h-4 w-4 text-[var(--color-fg-subtle)]" />
              <p
                className="line-clamp-5 text-[14.5px] leading-relaxed text-[var(--color-fg)]"
                style={{ fontFamily: "var(--font-serif), serif" }}
              >
                {t.quote}
              </p>
              <div className="mt-auto flex items-center gap-3 border-t border-[var(--color-border)] pt-3">
                {t.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-[var(--color-border)]"
                  />
                ) : (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-surface-2)] text-[11px] font-semibold">
                    {t.author_name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{t.author_name}</div>
                  {t.author_role && (
                    <div className="truncate text-[12px] text-[var(--color-fg-muted)]">
                      {t.author_role}
                    </div>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[var(--color-fg-subtle)]">
                  w={t.weight}
                </span>
                {!t.is_published && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10.5px] font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    <EyeOff className="h-2.5 w-2.5" /> Hidden
                  </span>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditing(t)}
                  className="absolute right-3 top-3 rounded-md p-1 text-[var(--color-fg-subtle)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
                >
                  Edit
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {editing && (
        <Editor
          siteSlug={siteSlug}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Editor({
  siteSlug,
  initial,
  onClose,
}: {
  siteSlug: string;
  initial?: TestimonialRow;
  onClose: () => void;
}) {
  const [authorName, setAuthorName] = useState(initial?.author_name ?? "");
  const [authorRole, setAuthorRole] = useState(initial?.author_role ?? "");
  const [quote, setQuote] = useState(initial?.quote ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url ?? "");
  const [weight, setWeight] = useState(String(initial?.weight ?? 0));
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [pending, start] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("author_name", authorName);
    fd.set("author_role", authorRole);
    fd.set("quote", quote);
    fd.set("avatar_url", avatarUrl);
    fd.set("weight", weight);
    if (isPublished) fd.set("is_published", "on");
    start(async () => {
      try {
        if (initial?.id) await updateTestimonial(siteSlug, initial.id, fd);
        else await createTestimonial(siteSlug, fd);
        toast.success(initial?.id ? "Saved" : "Created");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function remove() {
    if (!initial?.id || !confirm("Delete this testimonial?")) return;
    start(async () => {
      try {
        await deleteTestimonial(siteSlug, initial.id);
        toast.success("Deleted");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
              Testimonial · {initial?.id ? "Edit" : "New"}
            </div>
            <h2
              className="text-[18px] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              {initial?.id ? "Edit testimonial" : "Add a testimonial"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <Field label="Quote" required>
            <Textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={5}
              placeholder="What they said about your work, in their words."
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Author name" required>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ada Lovelace"
              />
            </Field>
            <Field label="Role / company">
              <Input
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                placeholder="CTO at Analytic Engines"
              />
            </Field>
          </div>

          <Field label="Avatar URL" hint="Square image works best">
            <Input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/portrait.jpg"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight" hint="Higher numbers surface first">
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
            <Field label="Visibility">
              <Select
                value={isPublished ? "published" : "hidden"}
                onChange={(e) => setIsPublished(e.target.value === "published")}
              >
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </Select>
            </Field>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
          {initial?.id && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              Cancel
            </button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : initial?.id ? "Save changes" : "Create"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
