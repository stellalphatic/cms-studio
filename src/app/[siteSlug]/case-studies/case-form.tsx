"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { uploadMedia } from "@/lib/media-upload";
import { slugify } from "@/lib/utils";
import type { CaseStudy, ContentStatus } from "@/lib/supabase/types";

interface Props {
  siteSlug: string;
  siteId: string;
  initial?: Partial<CaseStudy>;
  onSubmit: (formData: FormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function CaseForm({ siteSlug: _siteSlug, siteId, initial, onSubmit, onDelete }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [client, setClient] = useState(initial?.client ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [snippet, setSnippet] = useState(initial?.snippet ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [challenge, setChallenge] = useState(initial?.challenge ?? "");
  const [solution, setSolution] = useState(initial?.solution ?? "");
  const [outcomes, setOutcomes] = useState((initial?.outcomes ?? []).join("\n"));
  const [stack, setStack] = useState((initial?.stack ?? []).join(", "));
  const [metricsJson, setMetricsJson] = useState(JSON.stringify(initial?.metrics ?? [], null, 2));
  const [chartJson, setChartJson] = useState(JSON.stringify(initial?.chart ?? [], null, 2));
  const [status, setStatus] = useState<ContentStatus>(initial?.status ?? "draft");
  const [uploading, setUploading] = useState(false);

  const titleChanged = (next: string) => {
    setTitle(next);
    if (!initial?.id) setSlug(slugify(next));
  };

  function submit(formData: FormData) {
    formData.set("title", title);
    formData.set("slug", slug || slugify(title));
    formData.set("client", client ?? "");
    formData.set("industry", industry ?? "");
    formData.set("category", category ?? "");
    formData.set("snippet", snippet ?? "");
    formData.set("image_url", imageUrl ?? "");
    formData.set("challenge", challenge ?? "");
    formData.set("solution", solution ?? "");
    formData.set("outcomes", outcomes);
    formData.set("stack", stack);
    formData.set("metrics", metricsJson);
    formData.set("chart", chartJson);
    formData.set("status", status);
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
            <Input value={title} onChange={(e) => titleChanged(e.target.value)} />
          </Field>
          <Field label="Slug">
            <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client">
              <Input value={client ?? ""} onChange={(e) => setClient(e.target.value)} />
            </Field>
            <Field label="Industry">
              <Input value={industry ?? ""} onChange={(e) => setIndustry(e.target.value)} />
            </Field>
            <Field label="Category">
              <Input value={category ?? ""} onChange={(e) => setCategory(e.target.value)} />
            </Field>
            <Field label="Stack" hint="Comma separated">
              <Input value={stack} onChange={(e) => setStack(e.target.value)} />
            </Field>
          </div>
          <Field label="Snippet">
            <Textarea value={snippet ?? ""} onChange={(e) => setSnippet(e.target.value)} rows={3} />
          </Field>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
          <div className="text-sm font-semibold">Story</div>
          <Field label="Challenge">
            <Textarea value={challenge ?? ""} onChange={(e) => setChallenge(e.target.value)} rows={4} />
          </Field>
          <Field label="Solution">
            <Textarea value={solution ?? ""} onChange={(e) => setSolution(e.target.value)} rows={4} />
          </Field>
          <Field label="Outcomes" hint="One per line.">
            <Textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={5} />
          </Field>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
          <div className="text-sm font-semibold">Metrics & chart</div>
          <Field label="Metrics" hint='JSON array, e.g. [{"label":"Editorial Placements","value":"6+"}]'>
            <Textarea value={metricsJson} onChange={(e) => setMetricsJson(e.target.value)} rows={5} className="font-mono text-xs" />
          </Field>
          <Field label="Chart data" hint='JSON array, e.g. [{"stage":"Audit","score":45}]'>
            <Textarea value={chartJson} onChange={(e) => setChartJson(e.target.value)} rows={5} className="font-mono text-xs" />
          </Field>
        </div>
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
                if (!confirm("Delete this case study?")) return;
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
          <div className="text-sm font-semibold">Hero image</div>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="aspect-[16/10] w-full rounded-md object-cover" />
          ) : (
            <div className="grid aspect-[16/10] place-items-center rounded-md border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)] text-[var(--color-fg-subtle)]">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              const url = await uploadMedia({ file: f, siteId });
              setUploading(false);
              if (url) setImageUrl(url);
            }}
            className="block w-full text-xs"
          />
          {uploading && <div className="text-xs text-[var(--color-fg-subtle)]">Uploading…</div>}
          <Field label="Image URL">
            <Input value={imageUrl ?? ""} onChange={(e) => setImageUrl(e.target.value)} />
          </Field>
        </div>
      </aside>
    </form>
  );
}
