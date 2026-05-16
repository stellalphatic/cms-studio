import Link from "next/link";
import { LoginForm } from "./login-form";
import { StudioWordmark } from "@/components/brand/studio-mark";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

async function profileCount(): Promise<number> {
  try {
    const sb = createSupabaseAdminClient();
    const { count } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    // If env isn't configured yet, fall back to "no users" so the bootstrap
    // banner stays visible instead of hiding signup.
    return 0;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const hasAnyUsers = (await profileCount()) > 0;

  return (
    <div className="min-h-svh grid place-items-center px-6 py-12 bg-[var(--color-bg)]">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <StudioWordmark size={36} />
        </div>

        {!hasAnyUsers && (
          <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <div className="font-semibold mb-0.5">First-run setup</div>
            The first account you create becomes the platform super-admin and
            owner of every site. Use the <strong>Create account</strong> tab below.
          </div>
        )}

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <LoginForm
            searchParamsPromise={searchParams}
            allowSignup={!hasAnyUsers}
          />
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-fg-subtle)]">
          Forgot password? <Link className="underline" href="/forgot-password">Reset it</Link>
        </p>
      </div>
    </div>
  );
}
