-- ============================================================================
-- Seed: register the three known sites. UUIDs are deterministic so other
-- environments (local, staging, prod) can be wired against the same SITE_ID
-- env vars without coordination.
-- ============================================================================

insert into public.sites (id, slug, name, primary_domain, brand, enabled_content_types)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'searchhub',
    'SearchHub Digital',
    'searchhub.digital',
    jsonb_build_object(
      'logo', '/brands/searchhub.svg',
      'primary', '#0ea5e9',
      'accent', '#a855f7',
      'tagline', 'AI search & SEO that compounds.'
    ),
    array['blog_posts','case_studies','testimonials','faqs','pages','bulk_tiers']
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'kingsbridge',
    'Kingsbridge Immigration',
    'kingsbridgeimmigration.ca',
    jsonb_build_object(
      'logo', '/brands/kingsbridge.svg',
      'primary', '#b91c1c',
      'accent', '#0f172a',
      'tagline', 'Canadian immigration done right.'
    ),
    array['blog_posts','testimonials','faqs','pages','immigration_pathways','pricing_tiers']
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'vantage',
    'Vantage Printers',
    null,
    jsonb_build_object(
      'logo', '/brands/vantage.png',
      'primary', '#1d4ed8',
      'accent', '#facc15',
      'tagline', 'Print, packaging, possibility.'
    ),
    array['blog_posts','case_studies','testimonials','faqs','pages']
  )
on conflict (slug) do update set
  name = excluded.name,
  primary_domain = excluded.primary_domain,
  brand = excluded.brand,
  enabled_content_types = excluded.enabled_content_types;
