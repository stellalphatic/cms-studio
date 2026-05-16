"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/input";

export function FilterBar({
  siteSlug,
  initialQ,
  initialForm,
}: {
  siteSlug: string;
  initialQ: string;
  initialForm: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [form, setForm] = useState(initialForm);

  function go(next: { q?: string; form?: string }) {
    const params = new URLSearchParams(Array.from(sp.entries()));
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.form !== undefined) {
      if (next.form) params.set("form", next.form);
      else params.delete("form");
    }
    router.push(`/${siteSlug}/forms?${params.toString()}`);
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-64 max-w-md">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-fg-subtle)]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go({ q });
          }}
          placeholder="Search submissions…"
          className="pl-8"
        />
      </div>
      <Select
        value={form}
        onChange={(e) => {
          setForm(e.target.value);
          go({ form: e.target.value });
        }}
        className="w-44"
      >
        <option value="">All forms</option>
        <option value="contact">Contact</option>
        <option value="audit">Audit</option>
        <option value="consultation">Consultation</option>
      </Select>
    </div>
  );
}
