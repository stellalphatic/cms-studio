import { PageHeader } from "@/components/ui/page-header";
import { ComingSoon } from "@/components/ui/placeholder";

export const metadata = { title: "Pages" };

export default function PagesPage() {
  return (
    <div>
      <PageHeader title="Pages" description="Free-form, block-based static pages." />
      <ComingSoon what="Page builder" />
    </div>
  );
}
