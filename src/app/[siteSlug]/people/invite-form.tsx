"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { inviteMember } from "./actions";

export function InviteForm({ siteSlug }: { siteSlug: string }) {
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    start(async () => {
      try {
        await inviteMember(siteSlug, formData);
        toast.success("Invitation sent");
        (document.getElementById("invite-form") as HTMLFormElement | null)?.reset();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <form id="invite-form" action={submit} className="space-y-3">
      <Field label="Email" required>
        <Input name="email" type="email" required placeholder="teammate@company.com" />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue="editor">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send invite"}
      </Button>
    </form>
  );
}
