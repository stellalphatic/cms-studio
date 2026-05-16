"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * A monospaced, dark code block with a single "copy to clipboard" button in
 * the corner. Defaults to env-file styling but works for any plain text.
 */
export function CopyBlock({
  value,
  label,
  language = "ini",
}: {
  value: string;
  label?: string;
  language?: "ini" | "bash" | "json" | "ts";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // no-op — clipboard may be blocked in some contexts
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-fg)] text-[var(--color-bg)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/55">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
          {label ?? language}
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-white/80 transition hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
}
