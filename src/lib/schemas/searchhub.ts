import type { SiteSchema } from "./index";

export const searchhubSchema: SiteSchema = {
  slug: "searchhub",
  contentTypes: [
    {
      key: "blog_posts",
      label: "Blog post",
      pluralLabel: "Blog",
      icon: "FileText",
      customFields: [
        {
          key: "research_doc_url",
          label: "Internal research doc URL",
          type: "url",
          help: "Optional Google Doc / Notion link used while drafting.",
        },
      ],
    },
    {
      key: "case_studies",
      label: "Case study",
      pluralLabel: "Case studies",
      icon: "BarChart3",
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
      key: "bulk_tiers",
      label: "Bulk tier",
      pluralLabel: "Bulk pricing",
      icon: "Layers",
    },
    {
      key: "pages",
      label: "Page",
      pluralLabel: "Pages",
      icon: "Layout",
    },
  ],
};
