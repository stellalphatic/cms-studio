"use client";

import { useTransition } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { invitePlatformUser } from "./actions";

export function PlatformInviteForm() {
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    start(async () => {
      try {
        await invitePlatformUser(formData);
        toast.success("Invitation sent");
        (document.getElementById("platform-invite") as HTMLFormElement | null)?.reset();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to send invite");
      }
    });
  }

  return (
    <form
      id="platform-invite"
      action={submit}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <div className="mb-4">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
          Invite
        </div>
        <h2
          className="mt-1 text-[16px] font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-serif), serif" }}
        >
          Add a teammate
        </h2>
        <p className="mt-1 max-w-[60ch] text-[12.5px] text-[var(--color-fg-muted)]">
          Sends a Supabase Auth invitation email. After they sign in, grant
          per-site memberships from each workspace&apos;s People page, or check
          the platform-admin box below for full platform access.
        </p>
      </div>

      <div className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
        <Field label="Email" required>
          <Input name="email" type="email" required placeholder="teammate@company.com" />
        </Field>
        <Field label="Full name" hint="Optional">
          <Input name="full_name" placeholder="Ada Lovelace" />
        </Field>
        <Button type="submit" disabled={pending}>
          <UserPlus className="h-4 w-4" /> {pending ? "Sending…" : "Send invite"}
        </Button>
      </div>

      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-[var(--color-fg-muted)]">
        <input
          type="checkbox"
          name="is_platform_admin"
          className="accent-[var(--color-brand)]"
        />
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>
          Make platform admin <span className="text-[var(--color-fg-subtle)]">(sees every site, can create new ones)</span>
        </span>
      </label>
    </form>
  );
}
