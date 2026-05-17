"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createFaq, deleteFaq, updateFaq } from "./actions";

export interface FaqRow {
  id: string;
  question: string;
  answer_html: string;
  category: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
}

export function FaqsManager({
  siteSlug,
  faqs,
  canEdit,
  categories,
}: {
  siteSlug: string;
  faqs: FaqRow[];
  canEdit: boolean;
  categories: string[];
}) {
  const [editing, setEditing] = useState<FaqRow | "new" | null>(null);
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[var(--color-fg-muted)]">
            {faqs.length} {faqs.length === 1 ? "entry" : "entries"}
            {categories.length > 0 && (
              <>
                <span className="mx-2 text-[var(--color-fg-subtle)]">·</span>
                {categories.length} {categories.length === 1 ? "category" : "categories"}
              </>
            )}
          </p>
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> New FAQ
          </Button>
        </div>
      )}

      {faqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center">
          <p className="text-[14px] font-medium">No FAQs yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--color-fg-muted)]">
            Add the questions your customers ask most often. They&apos;ll appear on your site
            and in the JSON-LD `FAQPage` markup search engines love.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {faqs.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setOpenId((o) => (o === f.id ? null : f.id))}
                className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-[var(--color-surface-2)]/40"
              >
                <ChevronDown
                  className={cn(
                    "mt-1 h-3.5 w-3.5 shrink-0 text-[var(--color-fg-subtle)] transition-transform",
                    openId === f.id && "rotate-180",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-[var(--color-fg)]">
                      {f.question}
                    </span>
                    {!f.is_published && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10.5px] font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
                        <EyeOff className="h-2.5 w-2.5" /> Hidden
                      </span>
                    )}
                  </div>
                  {f.category && (
                    <div className="mt-0.5 font-mono text-[11px] text-[var(--color-fg-subtle)]">
                      {f.category}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(f);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setEditing(f)}
                    className="rounded-md p-1 text-[var(--color-fg-subtle)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
              {openId === f.id && (
                <div
                  className="prose prose-sm max-w-none px-5 pb-5 pl-12 text-[var(--color-fg-muted)]"
                  dangerouslySetInnerHTML={{ __html: f.answer_html }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <FaqEditor
          siteSlug={siteSlug}
          initial={editing === "new" ? undefined : editing}
          existingCategories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function FaqEditor({
  siteSlug,
  initial,
  existingCategories,
  onClose,
}: {
  siteSlug: string;
  initial?: FaqRow;
  existingCategories: string[];
  onClose: () => void;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer_html ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [pending, start] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("question", question);
    fd.set("answer_html", answer);
    fd.set("category", category);
    fd.set("sort_order", sortOrder);
    if (isPublished) fd.set("is_published", "on");
    start(async () => {
      try {
        if (initial?.id) await updateFaq(siteSlug, initial.id, fd);
        else await createFaq(siteSlug, fd);
        toast.success(initial?.id ? "Saved" : "Created");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function remove() {
    if (!initial?.id) return;
    if (!confirm("Delete this FAQ?")) return;
    start(async () => {
      try {
        await deleteFaq(siteSlug, initial.id);
        toast.success("Deleted");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
              FAQ · {initial?.id ? "Edit" : "New"}
            </div>
            <h2
              className="text-[18px] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              {initial?.id ? "Edit FAQ" : "Add an FAQ"}
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
          <Field label="Question" required>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What is your refund policy?"
              autoFocus
            />
          </Field>

          <Field label="Answer" hint="Plain text or basic HTML; renders inside <details>." required>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={8}
              placeholder="We offer a 30-day money-back guarantee on all plans…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" hint="Groups related questions">
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="General"
                list="faq-categories"
              />
              <datalist id="faq-categories">
                {existingCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Sort order" hint="Lower numbers appear first">
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Visibility">
            <Select
              value={isPublished ? "published" : "hidden"}
              onChange={(e) => setIsPublished(e.target.value === "published")}
            >
              <option value="published">Published — visible on site</option>
              <option value="hidden">Hidden — not shown</option>
            </Select>
          </Field>
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
              {isPublished && <Eye className="h-3.5 w-3.5 opacity-60" />}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
