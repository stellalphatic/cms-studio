"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/input";

export function WebinarFilterBar({
  siteSlug,
  initialQ,
  initialVariant,
}: {
  siteSlug: string;
  initialQ: string;
  initialVariant: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [variant, setVariant] = useState(initialVariant);

  function go(next: { q?: string; variant?: string }) {
    const params = new URLSearchParams(Array.from(sp.entries()));
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.variant !== undefined) {
      if (next.variant) params.set("variant", next.variant);
      else params.delete("variant");
    }
    router.push(`/${siteSlug}/webinar?${params.toString()}`);
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative min-w-64 max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-fg-subtle)]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go({ q });
          }}
          placeholder="Search name, email, WhatsApp…"
          className="pl-8"
        />
      </div>
      <Select
        value={variant}
        onChange={(e) => {
          setVariant(e.target.value);
          go({ variant: e.target.value });
        }}
        className="w-44"
      >
        <option value="">All variants</option>
        <option value="long">Long (/webinar)</option>
        <option value="short">Short (/shabbeers-webinar)</option>
      </Select>
    </div>
  );
}
