"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Select } from "@/components/ui/input";
import { formatRelative } from "@/lib/utils";
import { removeMember, updateMemberRole } from "./actions";
import type { SiteRole } from "@/lib/supabase/types";

export function MemberRow({
  siteSlug,
  userId,
  email,
  name,
  role,
  isSelf,
  joinedAt,
  canManage,
}: {
  siteSlug: string;
  userId: string;
  email: string;
  name: string | null;
  role: SiteRole;
  isSelf: boolean;
  joinedAt: string;
  canManage: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-surface-2)] text-xs font-medium text-[var(--color-fg-muted)]">
            {(name ?? email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium">{name ?? email} {isSelf && <span className="text-xs text-[var(--color-fg-subtle)]">(you)</span>}</div>
            {name && <div className="text-xs text-[var(--color-fg-subtle)]">{email}</div>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {canManage && !isSelf ? (
          <Select
            value={role}
            disabled={pending}
            onChange={(e) =>
              start(async () => {
                try {
                  await updateMemberRole(siteSlug, userId, e.target.value as SiteRole);
                  toast.success("Role updated");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              })
            }
            className="h-8 w-32"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </Select>
        ) : (
          <span className="text-xs capitalize text-[var(--color-fg-muted)]">{role}</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--color-fg-muted)]">{formatRelative(joinedAt)}</td>
      <td className="px-4 py-3 text-right">
        {canManage && !isSelf && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Remove ${name ?? email} from this workspace?`)) return;
              start(async () => {
                try {
                  await removeMember(siteSlug, userId);
                  toast.success("Removed");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-danger)] hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </td>
    </tr>
  );
}
