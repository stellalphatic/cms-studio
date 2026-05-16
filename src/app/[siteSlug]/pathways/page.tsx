import { PageHeader } from "@/components/ui/page-header";
import { ComingSoon } from "@/components/ui/placeholder";

export const metadata = { title: "Pathways" };

export default function PathwaysPage() {
  return (
    <div>
      <PageHeader title="Immigration pathways" description="Express Entry, PNP, study, work permit and family sponsorship pathway pages." />
      <ComingSoon what="Pathways manager" />
    </div>
  );
}
