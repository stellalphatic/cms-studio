import type { SiteSchema } from "./index";

export const kingsbridgeSchema: SiteSchema = {
  slug: "kingsbridge",
  contentTypes: [
    {
      key: "blog_posts",
      label: "Blog post",
      pluralLabel: "Blog",
      icon: "FileText",
    },
    {
      key: "immigration_pathways",
      label: "Immigration pathway",
      pluralLabel: "Pathways",
      icon: "Route",
      customFields: [
        {
          key: "rcic_required",
          label: "RCIC consultation required",
          type: "boolean",
          help: "Show the 'Book RCIC' CTA on the pathway page.",
        },
      ],
    },
    {
      key: "pricing_tiers",
      label: "Pricing tier",
      pluralLabel: "Pricing",
      icon: "DollarSign",
    },
    {
      key: "testimonials",
      label: "Testimonial",
      pluralLabel: "Testimonials",
      icon: "Quote",
    },
    {
      key: "faqs",
      label: "FAQ",
      pluralLabel: "FAQs",
      icon: "HelpCircle",
    },
    {
      key: "pages",
      label: "Page",
      pluralLabel: "Pages",
      icon: "Layout",
    },
  ],
};
