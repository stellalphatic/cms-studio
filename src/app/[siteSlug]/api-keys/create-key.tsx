"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createApiKey } from "./actions";

export function CreateApiKey({ siteSlug }: { siteSlug: string }) {
  const [pending, start] = useTransition();
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function submit(formData: FormData) {
    start(async () => {
      try {
        const res = await createApiKey(siteSlug, formData);
        setPlaintext(res.plaintext);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not create key");
      }
    });
  }

  async function copy() {
    if (!plaintext) return;
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (plaintext) {
    return (
      <div className="rounded-xl border border-[oklch(0.85_0.12_80)] bg-[var(--tone-warn-bg)] p-5">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--tone-warn-fg)]">
          New key · shown once
        </div>
        <p className="mt-1 text-[13px] text-[var(--tone-warn-fg)]">
          Copy this key now. You will not see it again, only its prefix.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 break-all rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 font-mono text-[12px] text-[var(--color-fg)]">
            {plaintext}
          </code>
          <Button type="button" variant="secondary" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <button
          type="button"
          onClick={() => setPlaintext(null)}
          className="mt-4 text-[12px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          Done, I&apos;ve saved it.
        </button>
      </div>
    );
  }

  return (
    <form
      action={submit}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <div className="grid items-end gap-3 sm:grid-cols-[2fr_140px_auto]">
        <Field label="Key name" required>
          <Input name="name" placeholder="kingsbridge production build" required />
        </Field>
        <Field label="Expires (days)" hint="0 = never">
          <Input name="expires_in_days" type="number" defaultValue={0} min={0} />
        </Field>
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" /> {pending ? "Creating…" : "Create key"}
        </Button>
      </div>
    </form>
  );
}
