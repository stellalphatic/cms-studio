import { PageHeader } from "@/components/ui/page-header";
import { ComingSoon } from "@/components/ui/placeholder";

export const metadata = { title: "FAQs" };

export default function FaqsPage() {
  return (
    <div>
      <PageHeader title="FAQs" description="Categorised question/answer pairs that ship to the site." />
      <ComingSoon what="FAQ manager" />
    </div>
  );
}
