"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import type { WebinarEmailStatus } from "@/lib/supabase/types";
import type { WebinarPaymentStatus } from "@/lib/webinar";
import {
  retryPaidConfirmationEmail,
  retryUnpaidReminderEmail,
  setWebinarPaymentStatus,
  updateWebinarNotes,
} from "../actions";

export function WebinarNotesEditor({
  siteSlug,
  id,
  initialNotes,
  paymentStatus,
  unpaidReminderStatus,
  paidConfirmationStatus,
}: {
  siteSlug: string;
  id: string;
  initialNotes: string;
  paymentStatus: WebinarPaymentStatus;
  unpaidReminderStatus: WebinarEmailStatus;
  paidConfirmationStatus: WebinarEmailStatus;
}) {
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState(paymentStatus);

  function save() {
    start(async () => {
      try {
        await updateWebinarNotes(siteSlug, id, notes);
        toast.success("Notes saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function setPaid(next: WebinarPaymentStatus) {
    start(async () => {
      try {
        await setWebinarPaymentStatus(siteSlug, id, next);
        setStatus(next);
        toast.success(
          next === "paid"
            ? "Marked paid"
            : next === "refunded"
              ? "Marked refunded"
              : "Marked unpaid",
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Update failed");
      }
    });
  }

  function retryUnpaid() {
    start(async () => {
      try {
        await retryUnpaidReminderEmail(siteSlug, id);
        toast.success("Payment reminder sent");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Send failed");
      }
    });
  }

  function retryPaid() {
    start(async () => {
      try {
        await retryPaidConfirmationEmail(siteSlug, id);
        toast.success("Zoom confirmation sent");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Send failed");
      }
    });
  }

  return (
    <aside className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">Payment</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-fg-muted)]">
            Use if Stripe paid but the webhook did not update this seat.
          </p>
        </div>
        {status === "unpaid" ? (
          <Button
            type="button"
            onClick={() => setPaid("paid")}
            disabled={pending}
            className="w-full"
          >
            {pending ? "Updating…" : "Mark paid"}
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            {status === "paid" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaid("refunded")}
                disabled={pending}
                className="w-full"
              >
                Mark refunded
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPaid("unpaid")}
              disabled={pending}
              className="w-full"
            >
              Mark unpaid
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-fg)]">Emails</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-fg-muted)]">
            Retry if status shows failed. Unpaid reminder waits ~15 minutes unless you send now.
          </p>
        </div>
        {status === "unpaid" && unpaidReminderStatus !== "sent" && (
          <Button
            type="button"
            variant="outline"
            onClick={retryUnpaid}
            disabled={pending}
            className="w-full"
          >
            {pending ? "Sending…" : "Send payment reminder now"}
          </Button>
        )}
        {status === "paid" && paidConfirmationStatus !== "sent" && (
          <Button
            type="button"
            variant="outline"
            onClick={retryPaid}
            disabled={pending}
            className="w-full"
          >
            {pending ? "Sending…" : "Send Zoom confirmation now"}
          </Button>
        )}
        {((status === "unpaid" && unpaidReminderStatus === "sent") ||
          (status === "paid" && paidConfirmationStatus === "sent")) && (
          <p className="text-xs text-[var(--color-fg-muted)]">
            Relevant emails already marked sent.
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <Field label="Internal notes" hint="Visible only to your team.">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} />
        </Field>
        <Button type="button" onClick={save} disabled={pending} className="w-full">
          {pending ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </aside>
  );
}
