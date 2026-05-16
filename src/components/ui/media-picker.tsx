"use client";

import { useState } from "react";
import { Image as ImageIcon, Link as LinkIcon, Loader2, Trash2, Upload } from "lucide-react";
import { uploadMedia } from "@/lib/media-upload";
import { cn } from "@/lib/utils";

type Mode = "upload" | "url";

/**
 * Cover / hero media picker. Two affordances in one quiet control:
 *   1. Upload — drag/click → Supabase storage → URL.
 *   2. URL — paste any external link (S3, Unsplash, your CDN).
 *
 * Returns the final URL via onChange. Preview is rendered inline so writers
 * see what readers will see, including aspect ratio.
 */
export function MediaPicker({
  value,
  onChange,
  siteId,
  aspect = "16/10",
}: {
  value: string;
  onChange: (url: string) => void;
  siteId: string;
  aspect?: "16/10" | "2/1" | "1/1" | "16/9";
}) {
  const [mode, setMode] = useState<Mode>("upload");
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadMedia({ file, siteId });
      if (url) onChange(url);
    } finally {
      setUploading(false);
    }
  }

  const aspectStyle = {
    "16/10": "aspect-[16/10]",
    "2/1": "aspect-[2/1]",
    "1/1": "aspect-square",
    "16/9": "aspect-video",
  }[aspect];

  return (
    <div className="space-y-3">
      {value ? (
        <div className={cn("relative overflow-hidden rounded-md ring-1 ring-[var(--color-border)]", aspectStyle)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-md bg-[oklch(0.18_0.01_270_/_0.6)] px-2 py-1 text-[11px] font-medium text-white backdrop-blur transition hover:bg-[oklch(0.18_0.01_270_/_0.8)]"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      ) : (
        <div className={cn("flex items-center justify-center rounded-md border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-2)] text-[var(--color-fg-subtle)]", aspectStyle)}>
          <ImageIcon className="h-6 w-6" />
        </div>
      )}

      <div className="inline-flex rounded-md border border-[var(--color-border)] p-0.5 text-[11.5px]">
        <ModeTab active={mode === "upload"} onClick={() => setMode("upload")}>
          <Upload className="h-3 w-3" /> Upload
        </ModeTab>
        <ModeTab active={mode === "url"} onClick={() => setMode("url")}>
          <LinkIcon className="h-3 w-3" /> URL
        </ModeTab>
      </div>

      {mode === "upload" ? (
        <label className="block">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <span className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[12.5px] font-medium transition hover:bg-[var(--color-surface-2)]">
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Choose image
              </>
            )}
          </span>
        </label>
      ) : (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://images.example.com/cover.jpg"
          className="h-9 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-[12px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-subtle)] focus-visible:border-[var(--color-brand)]"
        />
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 transition",
        active
          ? "bg-[var(--color-surface-2)] font-semibold text-[var(--color-fg)]"
          : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
      )}
    >
      {children}
    </button>
  );
}
