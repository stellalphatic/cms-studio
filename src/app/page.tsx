import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { getCurrentUserContext } from "@/lib/auth";
import { getWhitelabelSite } from "@/lib/host";

export const metadata = {
  title: "Studio — Multi-site editorial CMS",
  description:
    "One control plane for every site you operate. Editorial content, form submissions, deploy pipelines, and team access in a single workspace.",
};

export default async function RootPage() {
  const ctx = await getCurrentUserContext();
  if (ctx) {
    if (ctx.memberships.length === 1) {
      redirect(`/${ctx.memberships[0].site.slug}`);
    }
    redirect("/workspaces");
  }

  const whitelabel = await getWhitelabelSite();
  if (whitelabel) redirect("/login");

  return <LandingPage />;
}
