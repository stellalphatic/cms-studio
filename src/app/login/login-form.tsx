"use client";

import { useRouter } from "next/navigation";
import { use, useState, useTransition } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ next?: string; error?: string }>;
}) {
  const params = use(searchParamsPromise);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [magicSent, setMagicSent] = useState(false);

  async function passwordSignIn(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    const sb = createSupabaseBrowserClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      return;
    }
    router.replace(params.next ?? "/");
    router.refresh();
  }

  async function magicLink(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    const sb = createSupabaseBrowserClient();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(params.next ?? "/")}`,
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setMagicSent(true);
    toast.success("Magic link sent — check your inbox");
  }

  return (
    <form
      className="space-y-4"
      action={(fd) => start(() => passwordSignIn(fd))}
      noValidate
    >
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm shadow-xs"
          placeholder="you@company.com"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm shadow-xs"
        />
      </div>

      {params.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-fg)] shadow-xs transition disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="relative my-2 flex items-center">
        <span className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="px-3 text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">or</span>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <button
        type="button"
        formAction={(fd) => start(() => magicLink(fd))}
        disabled={pending || magicSent}
        className="inline-flex w-full items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm font-medium shadow-xs transition disabled:opacity-60"
      >
        {magicSent ? "Magic link sent ✓" : "Email me a magic link"}
      </button>
    </form>
  );
}
