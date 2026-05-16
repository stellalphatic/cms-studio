"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { createSite } from "./actions";

const ALL_TYPES = [
  "blog_posts",
  "case_studies",
  "testimonials",
  "faqs",
  "pages",
  "pricing_tiers",
  "bulk_tiers",
  "immigration_pathways",
  "services",
];

export function NewSiteForm() {
  const [pending, start] = useTransition();
  function submit(formData: FormData) {
    const types = ALL_TYPES.filter((t) => formData.get(`type_${t}`));
    formData.set("enabled_content_types", types.join(","));
    start(async () => {
      try {
        await createSite(formData);
        toast.success("Site created");
        (document.getElementById("new-site-form") as HTMLFormElement | null)?.reset();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not create site");
      }
    });
  }

  return (
    <form
      id="new-site-form"
      action={submit}
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4"
    >
      <div className="text-sm font-semibold">New site</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Slug" required hint="URL identifier (lowercase, no spaces)">
          <Input name="slug" placeholder="acme" required />
        </Field>
        <Field label="Display name" required>
          <Input name="name" placeholder="Acme Co" required />
        </Field>
      </div>
      <Field label="Primary domain" hint="Public website (no protocol)">
        <Input name="primary_domain" placeholder="acme.com" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand colour">
          <Input name="brand_primary" type="color" defaultValue="#4f46e5" />
        </Field>
        <Field label="Tagline">
          <Input name="brand_tagline" placeholder="One-line site tagline" />
        </Field>
      </div>
      <Field label="Enabled content types">
        <div className="flex flex-wrap gap-2 pt-1">
          {ALL_TYPES.map((t) => (
            <label
              key={t}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs"
            >
              <input
                type="checkbox"
                name={`type_${t}`}
                defaultChecked={["blog_posts", "case_studies", "testimonials", "faqs"].includes(t)}
                className="accent-[var(--color-brand)]"
              />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </Field>
      <Textarea name="enabled_content_types" className="hidden" defaultValue="" />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create site"}
        </Button>
      </div>
    </form>
  );
}
