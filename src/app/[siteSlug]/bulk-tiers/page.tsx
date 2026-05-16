import { PageHeader } from "@/components/ui/page-header";
import { ComingSoon } from "@/components/ui/placeholder";

export const metadata = { title: "Bulk pricing" };

export default function BulkTiersPage() {
  return (
    <div>
      <PageHeader title="Bulk pricing tiers" description="Volume-discount link-building tiers." />
      <ComingSoon what="Bulk tiers manager" />
    </div>
  );
}
