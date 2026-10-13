"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SiteLogo } from "@/components/brand/site-logo";
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
          hint="Paste an absolute https:// URL. Leave blank to auto-fetch the favicon from your primary domain, with a Studio-branded fallback."
        >
          <div className="flex items-center gap-3">
            <SiteLogo
              logoUrl={site.brand?.logo}
              domain={site.primary_domain}
              primary={site.brand?.primary}
              size={40}
              rounded="md"
            />
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
        <Field
          label="Notify emails"
          hint="Comma separated. Leave blank to auto-notify every owner + admin on this site."
        >
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

      <SettingSection
        title="Form spam defense · Cloudflare Turnstile"
        description="Enable per-site by filling BOTH fields. Empty = no captcha is enforced, so the form posts straight through. Get keys at dash.cloudflare.com/?to=/:account/turnstile."
      >
        <Field
          label="Site key (public)"
          hint="Goes into your site's VITE_TURNSTILE_SITE_KEY env so the widget renders."
        >
          <Input
            name="turnstile_site_key"
            defaultValue={site.turnstile_site_key ?? ""}
            disabled={!canEdit}
            placeholder="0x4AAAAA…"
            className="font-mono text-[12px]"
            autoComplete="off"
          />
        </Field>
        <Field
          label="Secret key"
          hint="Server-only. Studio uses this to verify the widget response."
        >
          <Input
            name="turnstile_secret_key"
            defaultValue={site.turnstile_secret_key ?? ""}
            disabled={!canEdit}
            placeholder="0x4AAAAA…"
            className="font-mono text-[12px]"
            type="password"
            autoComplete="off"
          />
        </Field>
      </SettingSection>

      <SettingSection
        title="Brevo · client email"
        description="Per-site Brevo mail for webinar leads. Prefer the REST API key (xkeysib-…). SMTP login/key is a fallback. Leave blank to use platform env."
      >
        <Field label="Brevo API key" hint="app.brevo.com → Settings → API Keys">
          <Input
            name="brevo_api_key"
            defaultValue={site.brevo_api_key ?? ""}
            disabled={!canEdit}
            placeholder="xkeysib-…"
            type="password"
            className="font-mono text-[12px]"
            autoComplete="off"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SMTP login" hint="Optional fallback">
            <Input
              name="brevo_smtp_login"
              defaultValue={site.brevo_smtp_login ?? ""}
              disabled={!canEdit}
              placeholder="…@smtp-brevo.com"
              className="font-mono text-[12px]"
              autoComplete="off"
            />
          </Field>
          <Field label="SMTP key" hint="xsmtpsib-…">
            <Input
              name="brevo_smtp_key"
              defaultValue={site.brevo_smtp_key ?? ""}
              disabled={!canEdit}
              placeholder="xsmtpsib-…"
              type="password"
              className="font-mono text-[12px]"
              autoComplete="off"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From email" hint="Verified sender on Brevo domain">
            <Input
              name="brevo_from_email"
              defaultValue={site.brevo_from_email ?? ""}
              disabled={!canEdit}
              placeholder="noreply@kingsbridgeimmigration.ca"
            />
          </Field>
          <Field label="From name">
            <Input
              name="brevo_from_name"
              defaultValue={site.brevo_from_name ?? ""}
              disabled={!canEdit}
              placeholder="Kingsbridge Immigration"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Leads list ID" hint="Brevo list for unpaid leads">
            <Input
              name="brevo_leads_list_id"
              defaultValue={site.brevo_leads_list_id ?? ""}
              disabled={!canEdit}
              placeholder="2"
              className="font-mono text-[12px]"
            />
          </Field>
          <Field label="Registered list ID" hint="Brevo list after paid">
            <Input
              name="brevo_registered_list_id"
              defaultValue={site.brevo_registered_list_id ?? ""}
              disabled={!canEdit}
              placeholder="3"
              className="font-mono text-[12px]"
            />
          </Field>
        </div>
      </SettingSection>

      {site.slug === "kingsbridge" && (
        <SettingSection
          title="Webinar email content"
          description="Date, Zoom, and unpaid reminder delay used in client emails. Confirm with the host before go-live."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Webinar date label">
              <Input
                name="webinar_date_label"
                defaultValue={site.webinar_date_label ?? "October 21, 2026"}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Local time label">
              <Input
                name="webinar_local_time_label"
                defaultValue={
                  site.webinar_local_time_label ?? "12:30 PM America/Toronto"
                }
                disabled={!canEdit}
              />
            </Field>
          </div>
          <Field label="Timezone (IANA)">
            <Input
              name="webinar_timezone"
              defaultValue={site.webinar_timezone ?? "America/Toronto"}
              disabled={!canEdit}
              className="font-mono text-[12px]"
            />
          </Field>
          <Field label="Zoom join URL">
            <Input
              name="webinar_zoom_url"
              defaultValue={site.webinar_zoom_url ?? ""}
              disabled={!canEdit}
              placeholder="https://us06web.zoom.us/j/…"
              className="font-mono text-[12px]"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Zoom meeting ID">
              <Input
                name="webinar_zoom_meeting_id"
                defaultValue={site.webinar_zoom_meeting_id ?? ""}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Zoom passcode">
              <Input
                name="webinar_zoom_passcode"
                defaultValue={site.webinar_zoom_passcode ?? ""}
                disabled={!canEdit}
              />
            </Field>
          </div>
          <Field
            label="Unpaid reminder delay (minutes)"
            hint="Send payment email only if still unpaid after this delay."
          >
            <Input
              name="webinar_unpaid_reminder_minutes"
              type="number"
              min={1}
              defaultValue={site.webinar_unpaid_reminder_minutes ?? 15}
              disabled={!canEdit}
              className="font-mono text-[12px] max-w-[120px]"
            />
          </Field>
        </SettingSection>
      )}

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
