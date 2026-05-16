import { Sparkles } from "lucide-react";

export function ComingSoon({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] p-12 text-center">
      <Sparkles className="mx-auto h-6 w-6 text-[var(--color-fg-subtle)]" />
      <p className="mt-3 text-sm font-medium">{what}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--color-fg-muted)]">
        This area is wired and ready — UI lands in a follow-up phase. The data layer and
        permissions are already in place.
      </p>
    </div>
  );
}
