"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revokeApiKey } from "./actions";

export function RevokeButton({ siteSlug, id }: { siteSlug: string; id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Revoke this key? Apps using it will start getting 401s immediately.")) return;
        start(async () => {
          try {
            await revokeApiKey(siteSlug, id);
            toast.success("Key revoked");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
    >
      Revoke
    </Button>
  );
}
