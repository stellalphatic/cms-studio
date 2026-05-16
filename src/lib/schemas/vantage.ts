import type { SiteSchema } from "./index";

export const vantageSchema: SiteSchema = {
  slug: "vantage",
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
