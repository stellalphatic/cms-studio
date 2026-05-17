"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasRole, requireSiteAccess } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { withAction } from "@/lib/action-error";

const faqSchema = z.object({
  question: z.string().min(1, "Question is required").max(500),
  answer_html: z.string().min(1, "Answer is required"),
  category: z.string().max(80).optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
  is_published: z.boolean().default(true),
});

function ensureEditor(role: string) {
  if (!hasRole(role as "owner" | "admin" | "editor" | "viewer", "editor")) {
    throw new Error("Only editors can change FAQs");
  }
}

function parse(formData: FormData) {
  return faqSchema.parse({
    question: String(formData.get("question") ?? "").trim(),
    answer_html: String(formData.get("answer_html") ?? "").trim(),
    category: String(formData.get("category") ?? "") || null,
    sort_order: String(formData.get("sort_order") ?? "0"),
    is_published: formData.get("is_published") === "on" || formData.get("is_published") === "true",
  });
}

export async function createFaq(siteSlug: string, formData: FormData) {
  return withAction("createFaq", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const input = parse(formData);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("faqs")
      .insert({ site_id: site.id, ...input })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "create",
      entity: "faqs",
      entity_id: data.id,
    });
    revalidatePath(`/${siteSlug}/faqs`);
  });
}

export async function updateFaq(siteSlug: string, id: string, formData: FormData) {
  return withAction("updateFaq", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const input = parse(formData);

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("faqs")
      .update(input)
      .eq("id", id)
      .eq("site_id", site.id);
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "update",
      entity: "faqs",
      entity_id: id,
    });
    revalidatePath(`/${siteSlug}/faqs`);
  });
}

export async function deleteFaq(siteSlug: string, id: string) {
  return withAction("deleteFaq", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("faqs").delete().eq("id", id).eq("site_id", site.id);
    if (error) throw new Error(error.message);
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "delete",
      entity: "faqs",
      entity_id: id,
    });
    revalidatePath(`/${siteSlug}/faqs`);
  });
}

export async function reorderFaqs(siteSlug: string, ids: string[]) {
  return withAction("reorderFaqs", async () => {
    const { ctx, site, role } = await requireSiteAccess(siteSlug);
    ensureEditor(role);
    const supabase = await createSupabaseServerClient();
    for (let i = 0; i < ids.length; i++) {
      await supabase
        .from("faqs")
        .update({ sort_order: i })
        .eq("id", ids[i])
        .eq("site_id", site.id);
    }
    await logAudit({
      site_id: site.id,
      actor_id: ctx.user.id,
      action: "reorder",
      entity: "faqs",
      entity_id: site.id,
    });
    revalidatePath(`/${siteSlug}/faqs`);
  });
}
