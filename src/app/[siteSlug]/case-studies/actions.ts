"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";

const caseSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  client: z.string().max(200).optional().nullable(),
  industry: z.string().max(200).optional().nullable(),
  category: z.string().max(120).optional().nullable(),
  snippet: z.string().max(600).optional().nullable(),
  image_url: z.string().url().or(z.literal("")).optional().nullable(),
  metrics: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  chart: z.array(z.object({ stage: z.string(), score: z.number() })).default([]),
  challenge: z.string().optional().nullable(),
  solution: z.string().optional().nullable(),
  outcomes: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
});

type Input = z.infer<typeof caseSchema>;

function parseFD(formData: FormData): Input {
  const json = (key: string, fallback: unknown) => {
    try {
      const v = String(formData.get(key) ?? "");
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };

  return caseSchema.parse({
    title: String(formData.get("title") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? "")),
    client: String(formData.get("client") ?? "") || null,
    industry: String(formData.get("industry") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    snippet: String(formData.get("snippet") ?? "") || null,
    image_url: String(formData.get("image_url") ?? "") || null,
    metrics: json("metrics", []),
    chart: json("chart", []),
    challenge: String(formData.get("challenge") ?? "") || null,
    solution: String(formData.get("solution") ?? "") || null,
    outcomes: String(formData.get("outcomes") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    stack: String(formData.get("stack") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    status: (String(formData.get("status") ?? "draft") as Input["status"]) || "draft",
  });
}

export async function createCaseStudy(siteSlug: string, formData: FormData) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const input = parseFD(formData);
  if (!input.slug) input.slug = slugify(input.title);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("case_studies")
    .insert({
      site_id: site.id,
      ...input,
      image_url: input.image_url || null,
      published_at: input.status === "published" ? new Date().toISOString() : null,
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "create",
    entity: "case_studies",
    entity_id: data.id,
    diff: { title: input.title, status: input.status },
  });
  revalidatePath(`/${siteSlug}/case-studies`);
  redirect(`/${siteSlug}/case-studies/${data.id}`);
}

export async function updateCaseStudy(siteSlug: string, id: string, formData: FormData) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const input = parseFD(formData);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("case_studies")
    .update({
      ...input,
      image_url: input.image_url || null,
      published_at:
        input.status === "published" ? new Date().toISOString() : null,
      updated_by: ctx.user.id,
    })
    .eq("id", id)
    .eq("site_id", site.id);
  if (error) throw new Error(error.message);
  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "update",
    entity: "case_studies",
    entity_id: id,
    diff: { title: input.title, status: input.status },
  });
  revalidatePath(`/${siteSlug}/case-studies`);
  revalidatePath(`/${siteSlug}/case-studies/${id}`);
}

export async function deleteCaseStudy(siteSlug: string, id: string) {
  const { ctx, site } = await requireSiteAccess(siteSlug);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("case_studies").delete().eq("id", id).eq("site_id", site.id);
  if (error) throw new Error(error.message);
  await logAudit({
    site_id: site.id,
    actor_id: ctx.user.id,
    action: "delete",
    entity: "case_studies",
    entity_id: id,
  });
  revalidatePath(`/${siteSlug}/case-studies`);
  redirect(`/${siteSlug}/case-studies`);
}
