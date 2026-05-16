"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setPlatformAdmin } from "./actions";

export function AdminToggle({
  userId,
  initial,
  selfId,
}: {
  userId: string;
  initial: boolean;
  selfId: string;
}) {
  const [pending, start] = useTransition();
  const isSelf = userId === selfId;
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        defaultChecked={initial}
        disabled={pending || isSelf}
        onChange={(e) => {
          const v = e.currentTarget.checked;
          start(async () => {
            try {
              await setPlatformAdmin(userId, v);
              toast.success(v ? "Promoted to platform admin" : "Demoted");
            } catch (err) {
              e.currentTarget.checked = !v;
              toast.error(err instanceof Error ? err.message : "Failed");
            }
          });
        }}
        className="accent-[var(--color-brand)]"
      />
      <span className={pending ? "opacity-50" : ""}>Platform admin</span>
    </label>
  );
}
