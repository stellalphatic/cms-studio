"use client";

import { useState, useTransition } from "react";
import { Check, EyeOff, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { createBulkTier, deleteBulkTier, updateBulkTier } from "./actions";

export interface BulkTierRow {
  id: string;
  tier_name: string;
  link_count: number | null;
  price_per_link: string | null;
  total_price: string | null;
  description: string | null;
  features: string[];
  highlight: boolean;
  sort_order: number;
  is_published: boolean;
}

export function BulkManager({
  siteSlug,
  rows,
  canEdit,
}: {
  siteSlug: string;
  rows: BulkTierRow[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<BulkTierRow | "new" | null>(null);

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[var(--color-fg-muted)]">
            {rows.length} {rows.length === 1 ? "tier" : "tiers"} · Order is set by sort number.
          </p>
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> New tier
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center">
          <p className="text-[14px] font-medium">No tiers yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--color-fg-muted)]">
            Create the bulk packages shown on your pricing page.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => (
            <article
              key={t.id}
              className={`group relative flex flex-col rounded-xl border bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-border-strong)] ${
                t.highlight
                  ? "border-[var(--color-brand)]/40 ring-1 ring-[var(--color-brand)]/15"
                  : "border-[var(--color-border)]"
              }`}
            >
              <header className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div
                    className="text-[18px] font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-serif), serif" }}
                  >
                    {t.tier_name}
                  </div>
                  {t.link_count != null && (
                    <div className="font-mono text-[11px] text-[var(--color-fg-subtle)]">
                      {t.link_count} links
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {t.highlight && (
                    <Star className="h-3.5 w-3.5 fill-current text-[var(--color-brand)]" />
                  )}
                  {!t.is_published && (
                    <EyeOff className="h-3.5 w-3.5 text-[var(--color-fg-subtle)]" />
                  )}
                </div>
              </header>

              <div className="space-y-1">
                {t.total_price && (
                  <div className="text-[20px] font-semibold">{t.total_price}</div>
                )}
                {t.price_per_link && (
                  <div className="text-[12px] text-[var(--color-fg-muted)]">
                    {t.price_per_link} / link
                  </div>
                )}
              </div>

              {t.description && (
                <p className="mt-3 line-clamp-3 text-[13px] text-[var(--color-fg-muted)]">
                  {t.description}
                </p>
              )}

              {t.features.length > 0 && (
                <ul className="mt-3 space-y-1 text-[12.5px]">
                  {t.features.slice(0, 5).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-fg-subtle)]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}

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
  initial?: BulkTierRow;
  onClose: () => void;
}) {
  const [tierName, setTierName] = useState(initial?.tier_name ?? "");
  const [linkCount, setLinkCount] = useState(initial?.link_count?.toString() ?? "");
  const [pricePer, setPricePer] = useState(initial?.price_per_link ?? "");
  const [total, setTotal] = useState(initial?.total_price ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [features, setFeatures] = useState((initial?.features ?? []).join("\n"));
  const [highlight, setHighlight] = useState(initial?.highlight ?? false);
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [pending, start] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("tier_name", tierName);
    fd.set("link_count", linkCount);
    fd.set("price_per_link", pricePer);
    fd.set("total_price", total);
    fd.set("description", description);
    fd.set("features", features);
    if (highlight) fd.set("highlight", "on");
    fd.set("sort_order", sortOrder);
    if (isPublished) fd.set("is_published", "on");
    start(async () => {
      try {
        if (initial?.id) await updateBulkTier(siteSlug, initial.id, fd);
        else await createBulkTier(siteSlug, fd);
        toast.success(initial?.id ? "Saved" : "Created");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function remove() {
    if (!initial?.id || !confirm("Delete this tier?")) return;
    start(async () => {
      try {
        await deleteBulkTier(siteSlug, initial.id);
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
              Tier · {initial?.id ? "Edit" : "New"}
            </div>
            <h2
              className="text-[18px] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-serif), serif" }}
            >
              {initial?.id ? "Edit tier" : "New bulk tier"}
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
          <Field label="Tier name" required>
            <Input
              value={tierName}
              onChange={(e) => setTierName(e.target.value)}
              placeholder="Pro pack"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Links">
              <Input
                type="number"
                value={linkCount}
                onChange={(e) => setLinkCount(e.target.value)}
                placeholder="25"
              />
            </Field>
            <Field label="Price per link">
              <Input
                value={pricePer}
                onChange={(e) => setPricePer(e.target.value)}
                placeholder="$120"
              />
            </Field>
            <Field label="Total price">
              <Input
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="$3,000"
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Who this is for and what's included."
            />
          </Field>

          <Field label="Features" hint="One per line">
            <Textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={5}
              placeholder={"DR40+ outreach\nManual link approval\nMonthly performance report"}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sort order">
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
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

          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={highlight}
              onChange={(e) => setHighlight(e.target.checked)}
              className="accent-[var(--color-brand)]"
            />
            <Star className="h-3.5 w-3.5" /> Highlight as the recommended tier
          </label>
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
