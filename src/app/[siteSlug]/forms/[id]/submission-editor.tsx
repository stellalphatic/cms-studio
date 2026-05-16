"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { deleteSubmission, updateSubmission } from "../actions";
import type { SubmissionStatus } from "@/lib/supabase/types";

interface Member {
  id: string;
  full_name: string | null;
  email: string;
}

export function SubmissionEditor({
  siteSlug,
  id,
  initialStatus,
  initialNotes,
  initialAssignedTo,
  members,
}: {
  siteSlug: string;
  id: string;
  initialStatus: SubmissionStatus;
  initialNotes: string;
  initialAssignedTo: string | null;
  members: Member[];
}) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus);
  const [assignedTo, setAssignedTo] = useState<string | "">(initialAssignedTo ?? "");
  const [notes, setNotes] = useState(initialNotes);

  function save() {
    start(async () => {
      try {
        await updateSubmission(siteSlug, id, {
          status,
          assigned_to: assignedTo || null,
          notes,
        });
        toast.success("Updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <aside className="space-y-5">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as SubmissionStatus)}>
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
            <option value="spam">Spam</option>
          </Select>
        </Field>
        <Field label="Assignee">
          <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">— Unassigned —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? m.email}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Internal notes" hint="Visible only to your team.">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} />
        </Field>
        <Button type="button" onClick={save} disabled={pending} className="w-full">
          {pending ? "Saving…" : "Save"}
        </Button>
        <button
          type="button"
          onClick={() => {
            if (!confirm("Delete this submission?")) return;
            start(async () => {
              try {
                await deleteSubmission(siteSlug, id);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Delete failed");
              }
            });
          }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--color-border-strong)] px-3 py-1.5 text-sm text-[var(--color-danger)] transition hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </aside>
  );
}
