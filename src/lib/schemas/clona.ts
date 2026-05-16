import type { SiteSchema } from "./index";

export const clonaSchema: SiteSchema = {
  slug: "clona",
  contentTypes: [
    {
      key: "blog_posts",
      label: "Blog post",
      pluralLabel: "Blog",
      icon: "FileText",
    },
    {
      key: "case_studies",
      label: "Case study",
      pluralLabel: "Case studies",
      icon: "BarChart3",
      customFields: [
        {
          key: "kicker",
          label: "Kicker",
          type: "text",
          help: 'Sub-title above the main title, e.g. "AI Automation · Media / Newsletter Publishing".',
        },
        {
          key: "verbatim",
          label: "Verbatim quotes (one per line)",
          type: "textarea",
          help: "Stored as a JSON array on the case study.",
        },
      ],
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
      key: "services",
      label: "Service",
      pluralLabel: "Services",
      icon: "Layers",
    },
  ],
};
