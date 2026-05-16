import { cn } from "@/lib/utils";
import type { ContentStatus, SubmissionStatus } from "@/lib/supabase/types";

export function ContentStatusPill({ status }: { status: ContentStatus }) {
  const map: Record<ContentStatus, string> = {
    draft: "bg-stone-100 text-stone-700",
    scheduled: "bg-amber-100 text-amber-800",
    published: "bg-emerald-100 text-emerald-800",
    archived: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", map[status])}>
      {status}
    </span>
  );
}

export function SubmissionStatusPill({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, string> = {
    new: "bg-indigo-100 text-indigo-800",
    in_progress: "bg-blue-100 text-blue-800",
    contacted: "bg-emerald-100 text-emerald-800",
    closed: "bg-stone-100 text-stone-600",
    spam: "bg-red-100 text-red-700",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", map[status])}>
      {status.replace("_", " ")}
    </span>
  );
}
