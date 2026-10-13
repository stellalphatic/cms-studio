/**
 * Kingsbridge webinar transactional emails via Brevo.
 * Unpaid reminder (after delay) + paid Zoom confirmation (immediate).
 */

import type { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendBrevoEmail, upsertBrevoContact } from "@/lib/brevo";
import { buildWebinarPaymentUrl } from "@/lib/webinar";
import {
  firstNameFromFullName,
  mailConfigured,
  resolveWebinarMailConfig,
  type SiteBrevoMailConfig,
} from "@/lib/webinar-mail-config";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type WebinarEmailStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "skipped";

type RegistrationEmailRow = {
  id: string;
  site_id: string;
  name: string;
  email: string;
  payment_status: string;
  unpaid_reminder_status: WebinarEmailStatus;
  unpaid_reminder_due_at: string | null;
  paid_confirmation_status: WebinarEmailStatus;
};

const SITE_MAIL_SELECT =
  "brevo_api_key, brevo_smtp_login, brevo_smtp_key, brevo_from_email, brevo_from_name, brevo_leads_list_id, brevo_registered_list_id, webinar_date_label, webinar_local_time_label, webinar_timezone, webinar_zoom_url, webinar_zoom_meeting_id, webinar_zoom_passcode, webinar_unpaid_reminder_minutes";

async function loadSiteMail(
  sb: AdminClient,
  siteId: string,
): Promise<SiteBrevoMailConfig | null> {
  const { data } = await sb
    .from("sites")
    .select(SITE_MAIL_SELECT)
    .eq("id", siteId)
    .maybeSingle<SiteBrevoMailConfig>();
  return data ?? null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unpaidReminderCopy(args: {
  firstName: string;
  webinarDate: string;
  paymentUrl: string;
}): { subject: string; preheader: string; text: string; html: string } {
  const subject = "Complete your $1 webinar seat reservation";
  const preheader =
    "Your seat is not confirmed until your $1 payment is complete.";
  const text = `Hi ${args.firstName},

Thanks for your interest in RCIC Shabbeer's webinar on ${args.webinarDate}.

Your registration is not confirmed yet. To reserve your seat, please complete the $1 online card payment using the link below. It costs less than a cup of coffee.

Reserve my seat for $1:
${args.paymentUrl}

After Stripe confirms your payment, we will email your registration confirmation and Zoom joining details.

If you have already paid, please allow a few minutes for the payment status to update. You do not need to pay again.

Regards,
Kingsbridge Immigration
RCIC Shabbeer (R535845)`;

  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;line-height:1.55;color:#0f172a;background:#f8fafc;padding:24px;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px 24px;">
    <p style="margin:0 0 16px;">Hi ${escapeHtml(args.firstName)},</p>
    <p style="margin:0 0 16px;">Thanks for your interest in RCIC Shabbeer&rsquo;s webinar on <strong>${escapeHtml(args.webinarDate)}</strong>.</p>
    <p style="margin:0 0 16px;">Your registration is not confirmed yet. To reserve your seat, please complete the $1 online card payment using the button below. It costs less than a cup of coffee.</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${escapeHtml(args.paymentUrl)}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;">RESERVE MY SEAT FOR $1</a>
    </p>
    <p style="margin:0 0 16px;">After Stripe confirms your payment, we will email your registration confirmation and Zoom joining details.</p>
    <p style="margin:0 0 16px;">If you have already paid, please allow a few minutes for the payment status to update. You do not need to pay again.</p>
    <p style="margin:24px 0 0;">Regards,<br/>Kingsbridge Immigration<br/>RCIC Shabbeer (R535845)</p>
  </div>
</body></html>`;

  return { subject, preheader, text, html };
}

function paidConfirmationCopy(args: {
  firstName: string;
  webinarDate: string;
  localTime: string;
  zoomUrl: string;
  meetingId: string;
  passcode: string;
}): { subject: string; preheader: string; text: string; html: string } {
  const subject = "You're registered: RCIC Shabbeer's webinar details";
  const preheader = "Your seat is confirmed. Save the Zoom details below.";
  const text = `Hi ${args.firstName},

Your $1 payment has been confirmed and your seat is reserved for RCIC Shabbeer's webinar.

Webinar date: ${args.webinarDate}
Time: ${args.localTime}
Host time: October 21, 2026 at 12:30 PM America/Toronto

Join the Zoom meeting:
${args.zoomUrl}

Meeting ID: ${args.meetingId}
Passcode: ${args.passcode}

Please join a few minutes early. Keep this email so you can find the joining details when the webinar begins.

Regards,
Kingsbridge Immigration
RCIC Shabbeer (R535845)`;

  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;line-height:1.55;color:#0f172a;background:#f8fafc;padding:24px;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px 24px;">
    <p style="margin:0 0 16px;">Hi ${escapeHtml(args.firstName)},</p>
    <p style="margin:0 0 16px;">Your $1 payment has been confirmed and your seat is reserved for RCIC Shabbeer&rsquo;s webinar.</p>
    <p style="margin:0 0 8px;"><strong>Webinar date:</strong> ${escapeHtml(args.webinarDate)}<br/>
    <strong>Time:</strong> ${escapeHtml(args.localTime)}<br/>
    <strong>Host time:</strong> October 21, 2026 at 12:30 PM America/Toronto</p>
    <p style="margin:16px 0 8px;"><strong>Join the Zoom meeting:</strong><br/>
    <a href="${escapeHtml(args.zoomUrl)}" style="color:#b91c1c;">${escapeHtml(args.zoomUrl)}</a></p>
    <p style="margin:0 0 16px;"><strong>Meeting ID:</strong> ${escapeHtml(args.meetingId)}<br/>
    <strong>Passcode:</strong> ${escapeHtml(args.passcode)}</p>
    <p style="margin:0 0 16px;">Please join a few minutes early. Keep this email so you can find the joining details when the webinar begins.</p>
    <p style="margin:24px 0 0;">Regards,<br/>Kingsbridge Immigration<br/>RCIC Shabbeer (R535845)</p>
  </div>
</body></html>`;

  return { subject, preheader, text, html };
}

/** After unpaid row is created: schedule reminder + sync Brevo Leads list. */
export async function onWebinarUnpaidCreated(args: {
  sb: AdminClient;
  registrationId: string;
}): Promise<void> {
  const { data: row } = await args.sb
    .from("webinar_registrations")
    .select(
      "id, site_id, name, email, payment_status, unpaid_reminder_status, unpaid_reminder_due_at, paid_confirmation_status",
    )
    .eq("id", args.registrationId)
    .maybeSingle<RegistrationEmailRow>();
  if (!row) return;

  const site = await loadSiteMail(args.sb, row.site_id);
  const cfg = resolveWebinarMailConfig(site);
  const dueAt = new Date(
    Date.now() + cfg.unpaidReminderMinutes * 60_000,
  ).toISOString();

  await args.sb
    .from("webinar_registrations")
    .update({
      unpaid_reminder_status: "pending",
      unpaid_reminder_due_at: dueAt,
      unpaid_reminder_error: null,
    })
    .eq("id", row.id)
    .eq("payment_status", "unpaid");

  if (!mailConfigured(cfg)) {
    console.warn("[webinar-emails] Brevo not configured; reminder scheduled but send will fail until keys are set");
  }

  const paymentUrl = buildWebinarPaymentUrl(row.id, row.email);
  const firstName = firstNameFromFullName(row.name);
  const contact = await upsertBrevoContact({
    cfg,
    email: row.email,
    listIds: cfg.leadsListId ? [cfg.leadsListId] : undefined,
    attributes: {
      FIRSTNAME: firstName === "there" ? undefined : firstName,
      CMS_LEAD_ID: row.id,
      PAYMENT_STATUS: "unpaid",
      PAYMENT_URL: paymentUrl,
      WEBINAR_DATE: cfg.webinarDate,
      LOCAL_TIME: cfg.localTime,
      ZOOM_LINK: cfg.zoomUrl,
      WEBINAR_TIMEZONE: cfg.timezone,
    },
  });
  if (contact.ok && contact.id != null) {
    await args.sb
      .from("webinar_registrations")
      .update({ brevo_contact_id: String(contact.id) })
      .eq("id", row.id);
  } else if (!contact.ok && contact.error !== "brevo_api_key_missing") {
    console.error("[webinar-emails] Brevo contact sync failed", row.id, contact.error);
  }
}

/** Cron worker: send due unpaid reminders (still unpaid, not yet emailed). */
export async function processDueUnpaidReminders(
  sb: AdminClient,
  limit = 40,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const nowIso = new Date().toISOString();
  const { data: due } = await sb
    .from("webinar_registrations")
    .select(
      "id, site_id, name, email, payment_status, unpaid_reminder_status, unpaid_reminder_due_at, paid_confirmation_status",
    )
    .eq("payment_status", "unpaid")
    .eq("unpaid_reminder_status", "pending")
    .lte("unpaid_reminder_due_at", nowIso)
    .order("unpaid_reminder_due_at", { ascending: true })
    .limit(limit);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of (due ?? []) as RegistrationEmailRow[]) {
    const result = await sendUnpaidReminderForRegistration(sb, row.id);
    if (result === "sent") sent += 1;
    else if (result === "failed") failed += 1;
    else skipped += 1;
  }

  return { sent, failed, skipped };
}

export async function sendUnpaidReminderForRegistration(
  sb: AdminClient,
  registrationId: string,
): Promise<"sent" | "failed" | "skipped"> {
  // Claim row so concurrent cron ticks don't double-send
  const { data: claimed } = await sb
    .from("webinar_registrations")
    .update({ unpaid_reminder_status: "sending", unpaid_reminder_error: null })
    .eq("id", registrationId)
    .eq("payment_status", "unpaid")
    .eq("unpaid_reminder_status", "pending")
    .select(
      "id, site_id, name, email, payment_status, unpaid_reminder_status, unpaid_reminder_due_at, paid_confirmation_status",
    )
    .maybeSingle<RegistrationEmailRow>();

  if (!claimed) return "skipped";

  const site = await loadSiteMail(sb, claimed.site_id);
  const cfg = resolveWebinarMailConfig(site);
  if (!mailConfigured(cfg)) {
    await sb
      .from("webinar_registrations")
      .update({
        unpaid_reminder_status: "failed",
        unpaid_reminder_error: "brevo_not_configured",
      })
      .eq("id", claimed.id)
      .eq("unpaid_reminder_status", "sending");
    return "failed";
  }

  const paymentUrl = buildWebinarPaymentUrl(claimed.id, claimed.email);
  const firstName = firstNameFromFullName(claimed.name);
  const copy = unpaidReminderCopy({
    firstName,
    webinarDate: cfg.webinarDate,
    paymentUrl,
  });

  await upsertBrevoContact({
    cfg,
    email: claimed.email,
    listIds: cfg.leadsListId ? [cfg.leadsListId] : undefined,
    attributes: {
      FIRSTNAME: firstName === "there" ? undefined : firstName,
      CMS_LEAD_ID: claimed.id,
      PAYMENT_STATUS: "unpaid",
      PAYMENT_URL: paymentUrl,
      WEBINAR_DATE: cfg.webinarDate,
      LOCAL_TIME: cfg.localTime,
      ZOOM_LINK: cfg.zoomUrl,
      WEBINAR_TIMEZONE: cfg.timezone,
    },
  });

  const send = await sendBrevoEmail({
    cfg,
    toEmail: claimed.email,
    toName: claimed.name,
    subject: copy.subject,
    htmlContent: copy.html,
    textContent: copy.text,
    tags: ["webinar-unpaid-reminder"],
  });

  if (!send.ok) {
    await sb
      .from("webinar_registrations")
      .update({
        unpaid_reminder_status: "failed",
        unpaid_reminder_error: send.error.slice(0, 500),
      })
      .eq("id", claimed.id)
      .eq("unpaid_reminder_status", "sending");
    return "failed";
  }

  await sb
    .from("webinar_registrations")
    .update({
      unpaid_reminder_status: "sent",
      unpaid_reminder_sent_at: new Date().toISOString(),
      unpaid_reminder_error: null,
    })
    .eq("id", claimed.id)
    .eq("unpaid_reminder_status", "sending");
  return "sent";
}

/** After Stripe marks paid: skip unpaid reminder + send Zoom confirmation once. */
export async function onWebinarMarkedPaid(args: {
  sb: AdminClient;
  registrationId: string;
}): Promise<void> {
  const { data: row } = await args.sb
    .from("webinar_registrations")
    .select(
      "id, site_id, name, email, payment_status, unpaid_reminder_status, unpaid_reminder_due_at, paid_confirmation_status",
    )
    .eq("id", args.registrationId)
    .maybeSingle<RegistrationEmailRow>();
  if (!row) return;

  // Stop unpaid follow-up if still pending
  if (row.unpaid_reminder_status === "pending") {
    await args.sb
      .from("webinar_registrations")
      .update({ unpaid_reminder_status: "skipped" })
      .eq("id", row.id)
      .eq("unpaid_reminder_status", "pending");
  }

  if (row.paid_confirmation_status === "sent") return;

  const site = await loadSiteMail(args.sb, row.site_id);
  const cfg = resolveWebinarMailConfig(site);

  if (!mailConfigured(cfg)) {
    await args.sb
      .from("webinar_registrations")
      .update({
        paid_confirmation_status: "failed",
        paid_confirmation_error: "brevo_not_configured",
      })
      .eq("id", row.id)
      .neq("paid_confirmation_status", "sent");
    return;
  }

  // Claim confirmation send (idempotent across webhook retries)
  const { data: claimed } = await args.sb
    .from("webinar_registrations")
    .update({
      paid_confirmation_status: "sending",
      paid_confirmation_error: null,
    })
    .eq("id", row.id)
    .eq("payment_status", "paid")
    .in("paid_confirmation_status", ["pending", "failed"])
    .select("id, name, email, paid_confirmation_status")
    .maybeSingle<{
      id: string;
      name: string;
      email: string;
      paid_confirmation_status: WebinarEmailStatus;
    }>();
  if (!claimed) return;

  const firstName = firstNameFromFullName(claimed.name);
  const copy = paidConfirmationCopy({
    firstName,
    webinarDate: cfg.webinarDate,
    localTime: cfg.localTime,
    zoomUrl: cfg.zoomUrl,
    meetingId: cfg.zoomMeetingId,
    passcode: cfg.zoomPasscode,
  });

  await upsertBrevoContact({
    cfg,
    email: claimed.email,
    listIds: cfg.registeredListId ? [cfg.registeredListId] : undefined,
    unlinkListIds: cfg.leadsListId ? [cfg.leadsListId] : undefined,
    attributes: {
      FIRSTNAME: firstName === "there" ? undefined : firstName,
      CMS_LEAD_ID: claimed.id,
      PAYMENT_STATUS: "paid",
      WEBINAR_DATE: cfg.webinarDate,
      LOCAL_TIME: cfg.localTime,
      ZOOM_LINK: cfg.zoomUrl,
      WEBINAR_TIMEZONE: cfg.timezone,
    },
  });

  const send = await sendBrevoEmail({
    cfg,
    toEmail: claimed.email,
    toName: claimed.name,
    subject: copy.subject,
    htmlContent: copy.html,
    textContent: copy.text,
    tags: ["webinar-paid-confirmation"],
  });

  if (!send.ok) {
    await args.sb
      .from("webinar_registrations")
      .update({
        paid_confirmation_status: "failed",
        paid_confirmation_error: send.error.slice(0, 500),
      })
      .eq("id", claimed.id)
      .eq("paid_confirmation_status", "sending");
    console.error("[webinar-emails] paid confirmation failed", claimed.id, send.error);
    return;
  }

  await args.sb
    .from("webinar_registrations")
    .update({
      paid_confirmation_status: "sent",
      paid_confirmation_sent_at: new Date().toISOString(),
      paid_confirmation_error: null,
    })
    .eq("id", claimed.id)
    .eq("paid_confirmation_status", "sending");
}
