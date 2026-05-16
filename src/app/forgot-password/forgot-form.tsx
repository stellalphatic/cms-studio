"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  async function submit(formData: FormData): Promise<void> {
    const email = String(formData.get("email") ?? "").trim();
    if (!email) {
      toast.error("Enter your email");
      return;
    }
    const sb = createSupabaseBrowserClient();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Check your email for the reset link");
  }

  return (
    <form
      action={(fd) => {
        start(() => {
          void submit(fd);
        });
      }}
      className="space-y-4"
    >
      <Field label="Email" required>
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Button type="submit" disabled={pending || sent} className="w-full">
        {sent ? "Email sent ✓" : pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
