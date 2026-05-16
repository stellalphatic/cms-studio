"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
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
    <form action={submit} className="space-y-10">
      <SettingSection
        title="Identity"
        description="The basics. Slug is fixed once set so existing links keep working."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Workspace name" required>
            <Input name="name" defaultValue={site.name} disabled={!canEdit} />
          </Field>
          <Field label="Slug" hint="Used in URLs">
            <Input value={site.slug} disabled className="font-mono text-[12px]" />
          </Field>
        </div>
        <Field
          label="Primary domain"
          hint="The public site, e.g. searchhub.digital"
        >
          <Input
            name="primary_domain"
            defaultValue={site.primary_domain ?? ""}
            disabled={!canEdit}
            placeholder="example.com"
            className="font-mono text-[12px]"
          />
        </Field>
        <Field
          label="Custom CMS subdomain"
          hint="CNAME e.g. cms.yourdomain.com to land directly in this workspace."
        >
          <Input
            name="cms_domain"
            defaultValue={site.cms_domain ?? ""}
            disabled={!canEdit}
            placeholder="cms.example.com"
            className="font-mono text-[12px]"
          />
        </Field>
      </SettingSection>

      <SettingSection
        title="Branding"
        description="Logo, colors and tagline used in this workspace's sidebar and on whitelabel CMS subdomains."
      >
        <Field
          label="Logo URL"
          hint="Square works best, e.g. 256×256. Paste a hosted URL (S3, Cloudinary, /brands/foo.svg)"
        >
          <div className="flex items-center gap-3">
            {site.brand?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.brand.logo}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-[var(--color-border)]"
              />
            ) : (
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[11px] font-semibold text-white"
                style={{ background: site.brand?.primary ?? "oklch(0.55 0.2 275)" }}
              >
                {site.name.charAt(0)}
              </div>
            )}
            <Input
              name="brand_logo"
              defaultValue={site.brand?.logo ?? ""}
              disabled={!canEdit}
              placeholder="https://cdn.example.com/logo.svg"
              className="font-mono text-[12px]"
            />
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary color" hint="Buttons & accents">
            <Input
              name="brand_primary"
              defaultValue={site.brand?.primary ?? "#4f46e5"}
              disabled={!canEdit}
              className="font-mono text-[12px]"
            />
          </Field>
          <Field label="Accent color">
            <Input
              name="brand_accent"
              defaultValue={site.brand?.accent ?? ""}
              disabled={!canEdit}
              className="font-mono text-[12px]"
            />
          </Field>
        </div>
        <Field label="Tagline">
          <Input
            name="brand_tagline"
            defaultValue={site.brand?.tagline ?? ""}
            disabled={!canEdit}
            placeholder="A one-line description of this workspace"
          />
        </Field>
      </SettingSection>

      <SettingSection
        title="Build webhook"
        description="A POST-only URL Studio calls to trigger a deploy of the public site. Works with Amplify, Vercel, Netlify, Cloudflare Pages and Render. POSTs are debounced ~30s so a burst of saves triggers one rebuild."
      >
        <Field
          label="Deploy hook URL"
          hint="Any platform that exposes a POST-able build/deploy hook"
        >
          <Input
            name="amplify_webhook_url"
            defaultValue={site.amplify_webhook_url ?? ""}
            disabled={!canEdit}
            placeholder="https://api.vercel.com/v1/integrations/deploy/prj_…/…"
            type="url"
            className="font-mono text-[12px]"
          />
        </Field>
        <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]/50 px-3 py-2 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">
          <summary className="cursor-pointer font-medium text-[var(--color-fg)]">
            Where do I get this URL?
          </summary>
          <ul className="mt-2 space-y-1.5">
            <li>
              <span className="font-medium text-[var(--color-fg)]">Vercel:</span>{" "}
              Project → Settings → Git → <span className="font-mono">Deploy Hooks</span>. Name it
              <span className="font-mono"> CMS</span>, pick the branch, copy the URL.
            </li>
            <li>
              <span className="font-medium text-[var(--color-fg)]">AWS Amplify:</span>{" "}
              App settings → Build settings → <span className="font-mono">Incoming webhooks</span> →
              Create webhook → copy URL.
            </li>
            <li>
              <span className="font-medium text-[var(--color-fg)]">Netlify:</span>{" "}
              Site settings → Build &amp; deploy → Continuous deployment →{" "}
              <span className="font-mono">Build hooks</span> → Add build hook.
            </li>
            <li>
              <span className="font-medium text-[var(--color-fg)]">Cloudflare Pages:</span>{" "}
              Project → Settings → Builds &amp; deployments → <span className="font-mono">Deploy hooks</span>.
            </li>
            <li>
              <span className="font-medium text-[var(--color-fg)]">Render:</span>{" "}
              Service → Settings → <span className="font-mono">Deploy hook</span>.
            </li>
          </ul>
        </details>
      </SettingSection>

      <SettingSection
        title="Form notifications"
        description="Each site uses its own Resend account so the right person gets contact-form emails. Leave blank to use the platform default."
      >
        <Field
          label="Resend API key"
          hint="resend.com → API Keys"
        >
          <Input
            name="resend_api_key"
            defaultValue={site.resend_api_key ?? ""}
            disabled={!canEdit}
            placeholder="re_..."
            type="password"
            className="font-mono text-[12px]"
          />
        </Field>
        <Field
          label="From address"
          hint="Must be a verified Resend sender"
        >
          <Input
            name="resend_from_email"
            defaultValue={site.resend_from_email ?? ""}
            disabled={!canEdit}
            placeholder="Notifications <hello@example.com>"
          />
        </Field>
        <Field label="Notify emails" hint="Comma separated">
          <Input
            name="notify_emails"
            defaultValue={(site.notify_emails ?? []).join(", ")}
            disabled={!canEdit}
            placeholder="owner@example.com, sales@example.com"
          />
        </Field>
      </SettingSection>

      <SettingSection
        title="CORS · public API"
        description="Origins allowed to POST to the form endpoint and read the public API. Defaults to the platform allow-list."
      >
        <Field label="Allowed origins" hint="Comma separated">
          <Textarea
            name="allowed_origins"
            rows={2}
            defaultValue={(site.allowed_origins ?? []).join(", ")}
            disabled={!canEdit}
            placeholder="https://example.com, https://www.example.com"
            className="font-mono text-[12px]"
          />
        </Field>
      </SettingSection>

      {canEdit && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <div className="rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-1 shadow-[0_4px_16px_-8px_oklch(0.18_0.01_270_/_0.25)]">
            <Button type="submit" disabled={pending} className="rounded-full px-5">
              {pending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-[var(--color-border)] pt-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="lg:pt-1">
        <h2
          className="text-[15px] font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-serif), serif" }}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-[36ch] text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
