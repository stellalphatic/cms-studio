/**
 * Kingsbridge webinar email defaults (CMO-approved Zoom invite).
 * Site Settings override these; platform env is last-resort fallback.
 */

export const DEFAULT_WEBINAR_DATE_LABEL = "October 21, 2026";
export const DEFAULT_WEBINAR_LOCAL_TIME_LABEL = "12:30 PM America/Toronto";
export const DEFAULT_WEBINAR_TIMEZONE = "America/Toronto";
export const DEFAULT_WEBINAR_ZOOM_URL =
  "https://us06web.zoom.us/j/81115328974?pwd=iws54ne0SHl0uRBSky9siDsQe60L29.1";
export const DEFAULT_WEBINAR_ZOOM_MEETING_ID = "811 1532 8974";
export const DEFAULT_WEBINAR_ZOOM_PASSCODE = "532418";
export const DEFAULT_UNPAID_REMINDER_MINUTES = 15;

export type SiteBrevoMailConfig = {
  brevo_api_key: string | null;
  brevo_smtp_login: string | null;
  brevo_smtp_key: string | null;
  brevo_from_email: string | null;
  brevo_from_name: string | null;
  brevo_leads_list_id: string | null;
  brevo_registered_list_id: string | null;
  webinar_date_label: string | null;
  webinar_local_time_label: string | null;
  webinar_timezone: string | null;
  webinar_zoom_url: string | null;
  webinar_zoom_meeting_id: string | null;
  webinar_zoom_passcode: string | null;
  webinar_unpaid_reminder_minutes: number | null;
};

export type ResolvedWebinarMailConfig = {
  apiKey: string | null;
  smtpLogin: string | null;
  smtpKey: string | null;
  fromEmail: string;
  fromName: string;
  leadsListId: number | null;
  registeredListId: number | null;
  webinarDate: string;
  localTime: string;
  timezone: string;
  zoomUrl: string;
  zoomMeetingId: string;
  zoomPasscode: string;
  unpaidReminderMinutes: number;
};

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    const t = (v ?? "").trim();
    if (t) return t;
  }
  return "";
}

function parseListId(raw: string | null | undefined): number | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** Resolve per-site Brevo settings with platform env fallbacks. */
export function resolveWebinarMailConfig(
  site: Partial<SiteBrevoMailConfig> | null | undefined,
): ResolvedWebinarMailConfig {
  const apiKey = firstNonEmpty(
    site?.brevo_api_key,
    process.env.BREVO_API_KEY,
  ) || null;
  const smtpLogin = firstNonEmpty(
    site?.brevo_smtp_login,
    process.env.BREVO_SMTP_LOGIN,
  ) || null;
  const smtpKey = firstNonEmpty(
    site?.brevo_smtp_key,
    process.env.BREVO_SMTP_KEY,
  ) || null;

  const fromEmail = firstNonEmpty(
    site?.brevo_from_email,
    process.env.BREVO_FROM_EMAIL,
    process.env.RESEND_FROM_EMAIL,
    "Kingsbridge Immigration <noreply@kingsbridgeimmigration.ca>",
  );

  const fromName = firstNonEmpty(
    site?.brevo_from_name,
    process.env.BREVO_FROM_NAME,
    "Kingsbridge Immigration",
  );

  const fromEnvMinutes = Number(
    process.env.WEBINAR_UNPAID_REMINDER_MINUTES ?? DEFAULT_UNPAID_REMINDER_MINUTES,
  );
  const unpaidReminderMinutes = Math.max(
    1,
    site?.webinar_unpaid_reminder_minutes ??
      (Number.isFinite(fromEnvMinutes) ? fromEnvMinutes : DEFAULT_UNPAID_REMINDER_MINUTES),
  );

  return {
    apiKey,
    smtpLogin,
    smtpKey,
    fromEmail,
    fromName,
    leadsListId: parseListId(
      site?.brevo_leads_list_id ?? process.env.BREVO_LEADS_LIST_ID,
    ),
    registeredListId: parseListId(
      site?.brevo_registered_list_id ?? process.env.BREVO_REGISTERED_LIST_ID,
    ),
    webinarDate: firstNonEmpty(
      site?.webinar_date_label,
      process.env.WEBINAR_DATE_LABEL,
      DEFAULT_WEBINAR_DATE_LABEL,
    ),
    localTime: firstNonEmpty(
      site?.webinar_local_time_label,
      process.env.WEBINAR_LOCAL_TIME_LABEL,
      DEFAULT_WEBINAR_LOCAL_TIME_LABEL,
    ),
    timezone: firstNonEmpty(
      site?.webinar_timezone,
      process.env.WEBINAR_TIMEZONE,
      DEFAULT_WEBINAR_TIMEZONE,
    ),
    zoomUrl: firstNonEmpty(
      site?.webinar_zoom_url,
      process.env.WEBINAR_ZOOM_URL,
      DEFAULT_WEBINAR_ZOOM_URL,
    ),
    zoomMeetingId: firstNonEmpty(
      site?.webinar_zoom_meeting_id,
      process.env.WEBINAR_ZOOM_MEETING_ID,
      DEFAULT_WEBINAR_ZOOM_MEETING_ID,
    ),
    zoomPasscode: firstNonEmpty(
      site?.webinar_zoom_passcode,
      process.env.WEBINAR_ZOOM_PASSCODE,
      DEFAULT_WEBINAR_ZOOM_PASSCODE,
    ),
    unpaidReminderMinutes,
  };
}

export function firstNameFromFullName(name: string | null | undefined): string {
  const part = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return part || "there";
}

/** REST API key required for send + contact sync (SMTP key alone is not enough). */
export function mailConfigured(cfg: ResolvedWebinarMailConfig): boolean {
  return Boolean(cfg.apiKey);
}
