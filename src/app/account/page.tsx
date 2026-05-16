import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { TotpEnrollment } from "./totp-enrollment";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const ctx = await requireUser();

  return (
    <div className="min-h-svh bg-[var(--color-bg)]">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
        <PageHeader title="Account" description={ctx.profile.email} />

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
          <div>
            <div className="text-sm font-semibold">Two-factor authentication</div>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              Protect your account with a one-time code from an authenticator app
              (1Password, Authy, Google Authenticator, …).
            </p>
          </div>
          <TotpEnrollment />
        </section>
      </div>
    </div>
  );
}
