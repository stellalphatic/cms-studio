import { cn } from "@/lib/utils";
import type { ContentStatus, SubmissionStatus } from "@/lib/supabase/types";

type Tone = "draft" | "info" | "publish" | "warn" | "bad";

const toneClass: Record<Tone, string> = {
  draft:   "bg-[var(--tone-draft-bg)] text-[var(--tone-draft-fg)]",
  info:    "bg-[var(--tone-info-bg)]  text-[var(--tone-info-fg)]",
  publish: "bg-[var(--tone-pub-bg)]   text-[var(--tone-pub-fg)]",
  warn:    "bg-[var(--tone-warn-bg)]  text-[var(--tone-warn-fg)]",
  bad:     "bg-[var(--tone-bad-bg)]   text-[var(--tone-bad-fg)]",
};

function Pill({ tone, dot, children }: { tone: Tone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight",
        toneClass[tone],
      )}
    >
      {dot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "currentColor", opacity: 0.7 }}
        />
      )}
      {children}
    </span>
  );
}

const contentTone: Record<ContentStatus, Tone> = {
  draft: "draft",
  scheduled: "warn",
  published: "publish",
  archived: "draft",
};

export function ContentStatusPill({ status }: { status: ContentStatus }) {
  return (
    <Pill tone={contentTone[status]} dot>
      <span className="capitalize">{status}</span>
    </Pill>
  );
}

const submissionTone: Record<SubmissionStatus, Tone> = {
  new: "info",
  in_progress: "warn",
  contacted: "publish",
  closed: "draft",
  spam: "bad",
};

export function SubmissionStatusPill({ status }: { status: SubmissionStatus }) {
  return (
    <Pill tone={submissionTone[status]} dot={status === "new"}>
      <span className="capitalize">{status.replace("_", " ")}</span>
    </Pill>
  );
}
