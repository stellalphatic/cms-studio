"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Section } from "@/components/ui/surface";
import { MediaPicker } from "@/components/ui/media-picker";
import { slugify } from "@/lib/utils";
import type { CaseStudy, ContentStatus } from "@/lib/supabase/types";

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const [publishedAt, setPublishedAt] = useState(toLocalInput(initial?.published_at));

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
    formData.set("published_at", publishedAt);
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
    <form action={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-8">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-6">
          <Section title="Identity">
            <div className="space-y-4">
              <Field label="Title" required>
                <Input value={title} onChange={(e) => titleChanged(e.target.value)} />
              </Field>
              <Field label="Slug">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="font-mono text-[12px]"
                />
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
              <Field label="Snippet" hint="One paragraph shown on cards & previews.">
                <Textarea value={snippet ?? ""} onChange={(e) => setSnippet(e.target.value)} rows={3} />
              </Field>
            </div>
          </Section>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <Section title="Story">
            <div className="space-y-4">
              <Field label="Challenge">
                <Textarea value={challenge ?? ""} onChange={(e) => setChallenge(e.target.value)} rows={4} />
              </Field>
              <Field label="Solution">
                <Textarea value={solution ?? ""} onChange={(e) => setSolution(e.target.value)} rows={4} />
              </Field>
              <Field label="Outcomes" hint="One per line">
                <Textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={5} />
              </Field>
            </div>
          </Section>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <Section title="Metrics & chart">
            <div className="space-y-4">
              <Field label="Metrics" hint='[{"label":"Placements","value":"6+"}]'>
                <Textarea
                  value={metricsJson}
                  onChange={(e) => setMetricsJson(e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="Chart data" hint='[{"stage":"Audit","score":45}]'>
                <Textarea
                  value={chartJson}
                  onChange={(e) => setChartJson(e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                />
              </Field>
            </div>
          </Section>
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : status === "published" ? "Publish" : "Save draft"}
              </Button>
              {onDelete && initial?.id && (
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
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-[var(--color-fg-subtle)] transition hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete case study
                </button>
              )}
            </div>
          </Section>

          <Section title="Hero image">
            <MediaPicker value={imageUrl ?? ""} onChange={setImageUrl} siteId={siteId} aspect="16/10" />
          </Section>
        </div>
      </aside>
    </form>
  );
}
