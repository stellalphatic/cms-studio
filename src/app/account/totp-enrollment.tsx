"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Factor = { id: string; status: string };
type Challenge = { factorId: string; qrCode: string; secret: string; uri: string };

export function TotpEnrollment() {
  const supabase = createSupabaseBrowserClient();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(
      (data?.all ?? []).map((f) => ({ id: f.id, status: f.status })) as Factor[],
    );
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    start(async () => {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) {
        toast.error(error.message);
        return;
      }
      setChallenge({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
    });
  }

  async function verify() {
    if (!challenge) return;
    start(async () => {
      const { data: chal } = await supabase.auth.mfa.challenge({ factorId: challenge.factorId });
      if (!chal) return;
      const { error } = await supabase.auth.mfa.verify({
        factorId: challenge.factorId,
        challengeId: chal.id,
        code,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("2FA enabled");
      setChallenge(null);
      setCode("");
      void refresh();
    });
  }

  async function remove(factorId: string) {
    if (!confirm("Remove this 2FA method?")) return;
    start(async () => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("2FA removed");
      void refresh();
    });
  }

  const verifiedFactors = factors.filter((f) => f.status === "verified");

  return (
    <div className="space-y-4">
      {verifiedFactors.length > 0 ? (
        <ul className="space-y-2">
          {verifiedFactors.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
            >
              <span>
                Authenticator app · <span className="text-[var(--color-fg-muted)]">{f.id.slice(0, 8)}</span>
              </span>
              <button
                onClick={() => remove(f.id)}
                disabled={pending}
                className="text-xs text-[var(--color-danger)] hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--color-fg-subtle)]">No 2FA methods enrolled.</p>
      )}

      {!challenge ? (
        <Button type="button" onClick={startEnroll} disabled={pending} variant="secondary">
          {pending ? "Working…" : verifiedFactors.length ? "Add another method" : "Enable 2FA"}
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <p className="text-sm">
            Scan this QR code with your authenticator app, then enter the 6-digit code below.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={challenge.qrCode} alt="TOTP QR" className="h-44 w-44 rounded bg-white p-2" />
          <details className="text-xs text-[var(--color-fg-muted)]">
            <summary className="cursor-pointer">Can&apos;t scan? Enter setup key manually</summary>
            <code className="mt-2 block break-all font-mono">{challenge.secret}</code>
          </details>
          <Field label="6-digit code">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="button" onClick={verify} disabled={pending || code.length < 6}>
              Verify & enable
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setChallenge(null);
                setCode("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
