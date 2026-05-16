import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function RootPage() {
  const ctx = await requireUser();
  if (ctx.memberships.length === 1) {
    redirect(`/${ctx.memberships[0].site.slug}`);
  }
  redirect("/workspaces");
}
