import { PageHeader } from "@/components/ui/page-header";
import { ComingSoon } from "@/components/ui/placeholder";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div>
      <PageHeader title="Pricing tiers" description="Service packages and consultation fees." />
      <ComingSoon what="Pricing manager" />
    </div>
  );
}
