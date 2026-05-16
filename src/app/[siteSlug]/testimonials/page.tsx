import { PageHeader } from "@/components/ui/page-header";
import { ComingSoon } from "@/components/ui/placeholder";

export const metadata = { title: "Testimonials" };

export default function TestimonialsPage() {
  return (
    <div>
      <PageHeader title="Testimonials" description="Quotes that you can surface anywhere on the site." />
      <ComingSoon what="Testimonials manager" />
    </div>
  );
}
