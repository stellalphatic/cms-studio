"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Rocket, Settings, X } from "lucide-react"; // CheckCircle2 used by Up-to-date chip
import Link from "next/link";
import { toast } from "sonner";
import { dispatchBuild, type DeployResult } from "@/app/[siteSlug]/deploy-actions";

interface Props {
  siteSlug: string;
  pendingCount: number;
  lastDeployedAt: string | null;
  hasWebhook: boolean;
  /** "viewer" | "editor" | "admin" | "owner" — only editor+ can deploy. */
  canDeploy: boolean;
}

/**
 * Manual deploy control. We deliberately rely on the editor to press this
 * instead of auto-firing a webhook on every save: a busy editing session
 * would otherwise queue dozens of rebuilds and burn through Amplify minutes.
 *
 * Behaviour:
 *   - "Deploy" pulse when there are pending changes.
 *   - "Up to date" with last-deployed timestamp when there aren't.
 *   - Confirmation modal before firing, with a reminder of how many
 *     content rows changed since last build.
 */
export function DeployButton({
  siteSlug,
  pendingCount,
  lastDeployedAt,
  hasWebhook,
  canDeploy,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [relative, setRelative] = useState(() => relativeTime(lastDeployedAt));

  // Re-render the "N minutes ago" label every 30 seconds without re-fetching.
  useEffect(() => {
    if (!lastDeployedAt) return;
    const t = setInterval(() => setRelative(relativeTime(lastDeployedAt)), 30_000);
    return () => clearInterval(t);
  }, [lastDeployedAt]);

  const hasChanges = pendingCount > 0;

  function deploy() {
    start(async () => {
      try {
        const result: DeployResult = await dispatchBuild(siteSlug);
        if (result.ok) {
          toast.success(
            result.dispatched > 1
              ? `Deploy triggered — ${result.dispatched} changes shipping`
              : "Deploy triggered",
            { description: "Your hosting provider will rebuild and publish." },
          );
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.message || "Deploy failed");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Deploy failed");
      }
    });
  }

  if (!canDeploy) return null;

  // When nothing is queued, the "Deploy" button is replaced by a passive
  // status chip. We don't allow firing the webhook just for the sake of it —
  // that prevents accidental rebuilds and matches the editor's expectation
  // that "Deploy" is a real action with consequences (build minutes, cache
  // invalidation, etc).
  if (!hasChanges) {
    return (
      <span
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 text-[12px] text-[var(--color-fg-muted)]"
        title={lastDeployedAt ? `Last deployed ${relative}` : "Nothing to deploy"}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        <span className="hidden md:inline">Up to date</span>
        {lastDeployedAt && (
          <span className="hidden font-mono text-[10.5px] text-[var(--color-fg-subtle)] lg:inline">
            · {relative}
          </span>
        )}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!hasWebhook}
        title={
          !hasWebhook
            ? "Add a deploy hook URL in Settings → Build webhook to enable manual publish"
            : `${pendingCount} change${pendingCount === 1 ? "" : "s"} pending`
        }
        className="group relative inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--color-fg)] px-2.5 text-[12px] font-medium text-[var(--color-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="relative grid place-items-center">
          <Rocket className="h-3.5 w-3.5" />
          <span className="absolute -right-1 -top-1 grid h-2 w-2 place-items-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
        </span>
        <span>Deploy</span>
        <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-bg)]/15 px-1 font-mono text-[10px]">
          {pendingCount}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <div
            className="absolute inset-0"
            onClick={() => !pending && setOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
            <header className="flex items-start justify-between border-b border-[var(--color-border)] px-6 py-5">
              <div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                  Manual deploy
                </div>
                <h2
                  className="mt-1 text-[20px] font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-serif), serif" }}
                >
                  Ship pending changes?
                </h2>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-fg)]"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-4 px-6 py-5 text-[13.5px] leading-relaxed text-[var(--color-fg-muted)]">
              {hasWebhook ? (
                <>
                  <p>
                    {hasChanges ? (
                      <>
                        <strong className="text-[var(--color-fg)]">{pendingCount}</strong>{" "}
                        content change{pendingCount === 1 ? "" : "s"} {pendingCount === 1 ? "is" : "are"}{" "}
                        queued since your last deploy. Your hosting provider will rebuild and publish
                        the static site — usually 1-3 minutes.
                      </>
                    ) : (
                      <>
                        No pending changes. You can still kick a deploy if you want to refresh the
                        live site (e.g. after fixing a config issue on the hosting side).
                      </>
                    )}
                  </p>
                  <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[11.5px] text-[var(--color-fg-muted)]">
                    POST → <span className="text-[var(--color-fg)]">deploy hook</span>
                  </div>
                  {lastDeployedAt && (
                    <p className="font-mono text-[11.5px] text-[var(--color-fg-subtle)]">
                      Last deploy: {relative}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>
                    You haven&apos;t configured a deploy hook for this site yet. Without one Studio
                    has nowhere to POST the rebuild request.
                  </p>
                  <Link
                    href={`/${siteSlug}/settings`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12.5px] text-[var(--color-fg)] hover:bg-[var(--color-surface-2)]"
                  >
                    <Settings className="h-3.5 w-3.5" /> Open Settings → Build webhook
                  </Link>
                </>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
              >
                Cancel
              </button>
              {hasWebhook && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={deploy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-fg)] px-4 py-1.5 text-[13px] font-medium text-[var(--color-bg)] hover:opacity-90 disabled:opacity-50"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  {pending ? "Deploying…" : "Deploy now"}
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "never";
  const seconds = Math.floor((Date.now() - d) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
