import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <div className="min-h-svh grid place-items-center px-6 py-12 bg-[var(--color-bg)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-brand)] text-[var(--color-brand-fg)] font-semibold">S</div>
          <div>
            <div className="text-base font-semibold tracking-tight">Studio</div>
            <div className="text-xs text-[var(--color-fg-muted)]">Multi-site CMS</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Use the email your admin invited.
        </p>

        <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <LoginForm searchParamsPromise={searchParams} />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-fg-subtle)]">
          Forgot password? <Link className="underline" href="/forgot-password">Reset it</Link>
        </p>
      </div>
    </div>
  );
}
