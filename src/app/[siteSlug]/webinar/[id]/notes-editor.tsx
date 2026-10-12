"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import type { WebinarPaymentStatus } from "@/lib/webinar";
import { setWebinarPaymentStatus, updateWebinarNotes } from "../actions";

export function WebinarNotesEditor({
  siteSlug,
  id,
  initialNotes,
  paymentStatus,
}: {
  siteSlug: string;
  id: string;
  initialNotes: string;
  paymentStatus: WebinarPaymentStatus;
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
