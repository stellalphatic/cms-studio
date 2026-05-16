"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { updateSiteSettings } from "./actions";
import type { Site } from "@/lib/supabase/types";

export function SettingsForm({ site, canEdit }: { site: Site; canEdit: boolean }) {
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    start(async () => {
      try {
        await updateSiteSettings(site.slug, formData);
        toast.success("Settings saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <Section title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Workspace name" required>
            <Input name="name" defaultValue={site.name} disabled={!canEdit} />
          </Field>
          <Field label="Slug" hint="URL identifier, not editable">
            <Input value={site.slug} disabled />
          </Field>
        </div>
        <Field
          label="Primary domain"
          hint="The public site, e.g. searchhub.digital. Used for preview links."
        >
          <Input
            name="primary_domain"
            defaultValue={site.primary_domain ?? ""}
            disabled={!canEdit}
            placeholder="example.com"
          />
        </Field>
        <Field
          label="Custom CMS subdomain"
          hint="Optional. If you CNAME e.g. cms.yourdomain.com to this Studio deployment, visitors land directly in this workspace."
        >
          <Input
            name="cms_domain"
            defaultValue={site.cms_domain ?? ""}
            disabled={!canEdit}
            placeholder="cms.example.com"
          />
        </Field>
      </Section>

      <Section title="Branding">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary color" hint="Used for buttons and accents">
            <Input
              name="brand_primary"
              defaultValue={site.brand?.primary ?? "#4f46e5"}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Accent color">
            <Input
              name="brand_accent"
              defaultValue={site.brand?.accent ?? ""}
              disabled={!canEdit}
            />
          </Field>
        </div>
        <Field label="Tagline">
          <Input
            name="brand_tagline"
            defaultValue={site.brand?.tagline ?? ""}
            disabled={!canEdit}
          />
        </Field>
      </Section>

      <Section
        title="Build webhook"
        description="Hit when published content changes (debounced 30s). Find this in AWS Amplify Console → App → App settings → Build settings → Incoming webhooks."
      >
        <Field label="Amplify webhook URL">
          <Input
            name="amplify_webhook_url"
            defaultValue={site.amplify_webhook_url ?? ""}
            disabled={!canEdit}
            placeholder="https://webhooks.amplify.us-east-1.amazonaws.com/prod/webhooks?id=..."
            type="url"
          />
        </Field>
      </Section>

      <Section
        title="Form notifications"
        description="Each site uses its own Resend account so the right person gets contact-form emails. Leave blank to use the platform default."
      >
        <Field
          label="Resend API key"
          hint="Get yours at resend.com → API Keys. Stored encrypted at rest."
        >
          <Input
            name="resend_api_key"
            defaultValue={site.resend_api_key ?? ""}
            disabled={!canEdit}
            placeholder="re_..."
            type="password"
          />
        </Field>
        <Field
          label="From address"
          hint='Must be a verified sender on this Resend account, e.g. "Studio Notifications &lt;notify@yourdomain.com&gt;"'
        >
          <Input
            name="resend_from_email"
            defaultValue={site.resend_from_email ?? ""}
            disabled={!canEdit}
            placeholder="Notifications <hello@example.com>"
          />
        </Field>
        <Field label="Notify emails" hint="Comma-separated recipients.">
          <Input
            name="notify_emails"
            defaultValue={(site.notify_emails ?? []).join(", ")}
            disabled={!canEdit}
            placeholder="owner@example.com, sales@example.com"
          />
        </Field>
      </Section>

      <Section
        title="CORS / public API"
        description="Origins allowed to POST to the public form endpoint and read the public API. Defaults to the platform allow-list."
      >
        <Field label="Allowed origins" hint="Comma-separated.">
          <Textarea
            name="allowed_origins"
            rows={2}
            defaultValue={(site.allowed_origins ?? []).join(", ")}
            disabled={!canEdit}
            placeholder="https://example.com, https://www.example.com"
          />
        </Field>
      </Section>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {description && (
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
