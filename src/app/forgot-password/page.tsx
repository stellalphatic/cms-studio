import { ForgotPasswordForm } from "./forgot-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-svh grid place-items-center px-6 py-12 bg-[var(--color-bg)]">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          We&apos;ll email you a one-time link.
        </p>
        <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
