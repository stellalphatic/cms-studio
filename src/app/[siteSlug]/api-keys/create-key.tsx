"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
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
      <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-3">
        <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Copy this key now — it will never be shown again.
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-amber-300 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-xs break-all">
            {plaintext}
          </code>
          <Button type="button" variant="secondary" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
        <Button type="button" variant="ghost" onClick={() => setPlaintext(null)}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form action={submit} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <Field label="Key name" required>
          <Input name="name" placeholder="kingsbridge production build" required />
        </Field>
        <Field label="Expires in (days)" hint="0 = no expiry">
          <Input name="expires_in_days" type="number" defaultValue={0} min={0} />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create key"}
        </Button>
      </div>
    </form>
  );
}
