"use client";

import { useRouter } from "next/navigation";
import { use, useState, useTransition } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginForm({
  searchParamsPromise,
  allowSignup = false,
}: {
  searchParamsPromise: Promise<{ next?: string; error?: string; mode?: string }>;
  allowSignup?: boolean;
}) {
  const params = use(searchParamsPromise);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [magicSent, setMagicSent] = useState(false);
  const [mode, setMode] = useState<Mode>(() => {
    if (params.mode === "signup" && allowSignup) return "signup";
    return allowSignup ? "signup" : "signin";
  });

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

  async function passwordSignUp(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("full_name") ?? "").trim();
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    const sb = createSupabaseBrowserClient();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || email.split("@")[0] },
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(params.next ?? "/")}`,
      },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    // If email confirmations are off (the default for new projects in many
    // regions), Supabase returns a session right away — just route forward.
    if (data.session) {
      toast.success("Account created");
      router.replace(params.next ?? "/");
      router.refresh();
      return;
    }
    toast.success("Check your inbox to confirm your email.");
    setMode("signin");
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

  const isSignup = mode === "signup";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          {isSignup ? "Create your account" : "Sign in"}
        </h1>
        {allowSignup && (
          <div className="inline-flex rounded-md border border-[var(--color-border)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded px-2 py-1 transition ${mode === "signin" ? "bg-[var(--color-surface-2)] font-semibold" : "text-[var(--color-fg-muted)]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded px-2 py-1 transition ${mode === "signup" ? "bg-[var(--color-surface-2)] font-semibold" : "text-[var(--color-fg-muted)]"}`}
            >
              Create account
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-[var(--color-fg-muted)]">
        {isSignup
          ? "Use the same email you'll log in with later."
          : allowSignup
            ? "Already have an account? Sign in here."
            : "Use the email your admin invited."}
      </p>

      <form
        className="space-y-4"
        action={(fd) =>
          start(() => (isSignup ? passwordSignUp(fd) : passwordSignIn(fd)))
        }
        noValidate
      >
        {isSignup && (
          <div className="space-y-1.5">
            <label htmlFor="full_name" className="text-sm font-medium">Your name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              className="w-full rounded-lg border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm shadow-xs"
              placeholder="Ada Lovelace"
            />
          </div>
        )}

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
          <label htmlFor="password" className="text-sm font-medium">
            Password
            {isSignup && (
              <span className="ml-1 text-[var(--color-fg-subtle)] font-normal">· 8+ characters</span>
            )}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 8 : undefined}
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
          {pending ? (isSignup ? "Creating account…" : "Signing in…") : isSignup ? "Create account" : "Sign in"}
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
    </div>
  );
}
