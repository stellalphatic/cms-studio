"use client";

import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadMedia({
  file,
  siteId,
  alt,
}: {
  file: File;
  siteId: string;
  alt?: string;
}): Promise<string | null> {
  if (!ALLOWED.includes(file.type)) {
    toast.error(`Unsupported file type: ${file.type}`);
    return null;
  }
  if (file.size > MAX_BYTES) {
    toast.error("Files must be under 10 MB");
    return null;
  }

  const supabase = createSupabaseBrowserClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${siteId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadErr) {
    toast.error(uploadErr.message);
    return null;
  }

  const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  await supabase.from("media").insert({
    site_id: siteId,
    storage_path: path,
    public_url: publicUrl,
    mime_type: file.type,
    file_size_bytes: file.size,
    alt: alt ?? null,
  });

  return publicUrl;
}
