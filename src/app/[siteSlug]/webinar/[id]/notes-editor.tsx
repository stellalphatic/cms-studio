"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { updateWebinarNotes } from "../actions";

export function WebinarNotesEditor({
  siteSlug,
  id,
  initialNotes,
}: {
  siteSlug: string;
  id: string;
  initialNotes: string;
}) {
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState(initialNotes);

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

  return (
    <aside className="space-y-5">
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
