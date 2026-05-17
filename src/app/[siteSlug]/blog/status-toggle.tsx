"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Eye, EyeOff, FileEdit, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { setBlogStatus } from "./actions";
import type { ContentStatus } from "@/lib/supabase/types";

const META: Record<
  ContentStatus,
  { label: string; tone: string; icon: React.ComponentType<{ className?: string }>; dot: string }
> = {
  draft: {
    label: "Draft",
    tone: "bg-[var(--color-surface-2)] text-[var(--color-fg-muted)] border-[var(--color-border)]",
    icon: FileEdit,
    dot: "bg-[var(--color-fg-subtle)]",
  },
  scheduled: {
    label: "Scheduled",
    tone: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    icon: EyeOff,
    dot: "bg-amber-500",
  },
  published: {
    label: "Published",
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    icon: Eye,
    dot: "bg-emerald-500",
  },
  archived: {
    label: "Archived",
    tone: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
    icon: Archive,
    dot: "bg-rose-500",
  },
};

const NEXT_STEPS: Record<ContentStatus, ContentStatus[]> = {
  draft: ["published", "archived"],
  scheduled: ["draft", "published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft", "published"],
};

export function StatusToggle({
  siteSlug,
  postId,
  postTitle,
  status,
  canEdit,
}: {
  siteSlug: string;
  postId: string;
  postTitle: string;
  status: ContentStatus;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ContentStatus | null>(null);
  const [pending, start] = useTransition();
  const meta = META[status];
  const Icon = meta.icon;

  function apply(next: ContentStatus) {
    setTarget(next);
    start(async () => {
      try {
        await setBlogStatus(siteSlug, postId, next);
        toast.success(
          next === "published" ? "Published" : next === "archived" ? "Archived" : `Moved to ${next}`,
          {
            description: "Press Deploy in the topbar when you're ready to push to the live site.",
          },
        );
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't change status");
      } finally {
        setTarget(null);
      }
    });
  }

  if (!canEdit) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`group inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition hover:shadow-sm ${meta.tone}`}
        title="Change status"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
        <Icon className="h-3 w-3 opacity-60 transition group-hover:opacity-100" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="absolute inset-0"
            onClick={() => !pending && setOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl">
            <header className="flex items-start justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div className="min-w-0">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
                  Change status
                </div>
                <h2
                  className="mt-0.5 truncate text-[16px] font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-serif), serif" }}
                  title={postTitle}
                >
                  {postTitle || "(untitled)"}
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

            <ul className="divide-y divide-[var(--color-border)]">
              {NEXT_STEPS[status].map((s) => {
                const m = META[s];
                const Mi = m.icon;
                const description = describe(status, s);
                return (
                  <li key={s}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => apply(s)}
                      className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-[var(--color-surface-2)] disabled:opacity-60"
                    >
                      <span
                        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border ${m.tone}`}
                      >
                        {pending && target === s ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mi className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-medium text-[var(--color-fg)]">
                          {verb(s)}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-[var(--color-fg-muted)]">
                          {description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 text-[11.5px] text-[var(--color-fg-subtle)]">
              Changes queue for the next deploy. Status flips immediately in Studio.
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function verb(s: ContentStatus): string {
  switch (s) {
    case "published":
      return "Publish";
    case "draft":
      return "Move to draft";
    case "archived":
      return "Archive";
    case "scheduled":
      return "Schedule";
  }
}

function describe(from: ContentStatus, to: ContentStatus): string {
  if (to === "published") {
    return from === "archived"
      ? "Bring it back and show it on the live site."
      : "Show this on the live site at the next deploy.";
  }
  if (to === "draft") return "Hide from the site and reopen for editing.";
  if (to === "archived") return "Hide from the site and from default lists in Studio.";
  return "Hold for its scheduled publish date.";
}
