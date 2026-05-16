"use client";

import { useRouter } from "next/navigation";
import { use, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
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
    toast.success("Magic link sent, check your inbox");
  }

  const isSignup = mode === "signup";

  return (
    <div className="space-y-6">
      <div>
        {allowSignup && (
          <div className="mb-5 inline-flex rounded-md border border-[var(--color-border)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded px-2.5 py-1 transition ${mode === "signin" ? "bg-[var(--color-surface-2)] font-semibold text-[var(--color-fg)]" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded px-2.5 py-1 transition ${mode === "signup" ? "bg-[var(--color-surface-2)] font-semibold text-[var(--color-fg)]" : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"}`}
            >
              Create account
            </button>
          </div>
        )}
        <h1
          className="text-[26px] leading-tight tracking-tight text-[var(--color-fg)]"
          style={{ fontFamily: "var(--font-serif), serif" }}
        >
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[var(--color-fg-muted)]">
          {isSignup
            ? "Use the email you'll log in with later."
            : allowSignup
              ? "Already have an account? Sign in here."
              : "Use the email your admin invited."}
        </p>
      </div>

      <form
        className="space-y-4"
        action={(fd) =>
          start(() => (isSignup ? passwordSignUp(fd) : passwordSignIn(fd)))
        }
        noValidate
      >
        {isSignup && (
          <Field label="Your name" htmlFor="full_name">
            <Input id="full_name" name="full_name" type="text" autoComplete="name" placeholder="Ada Lovelace" />
          </Field>
        )}

        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          hint={isSignup ? "8+ characters" : undefined}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 8 : undefined}
            required
          />
        </Field>

        {params.error && (
          <p className="rounded-md bg-[var(--tone-bad-bg)] px-3 py-2 text-[13px] text-[var(--tone-bad-fg)]">
            {params.error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? (isSignup ? "Creating account…" : "Signing in…") : isSignup ? "Create account" : "Sign in"}
        </Button>

        <div className="relative my-1 flex items-center">
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="px-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-fg-subtle)]">
            or
          </span>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          formAction={(fd) => start(() => magicLink(fd))}
          disabled={pending || magicSent}
          className="w-full"
        >
          {magicSent ? "Magic link sent" : "Email me a magic link"}
        </Button>
      </form>
    </div>
  );
}
