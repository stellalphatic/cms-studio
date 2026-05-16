import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/callback",
  "/invite",
];

/**
 * Map of cms_domain -> site_slug, refreshed periodically. Avoids a DB hit on
 * every request while still letting admins onboard new whitelabel domains
 * without redeploying. Cache TTL is 60s in production.
 */
let DOMAIN_CACHE: { at: number; map: Record<string, string> } = { at: 0, map: {} };
const DOMAIN_TTL_MS = 60_000;

async function getDomainMap(req: NextRequest): Promise<Record<string, string>> {
  if (Date.now() - DOMAIN_CACHE.at < DOMAIN_TTL_MS) return DOMAIN_CACHE.map;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sites?select=slug,cms_domain&cms_domain=not.is.null`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return DOMAIN_CACHE.map;
    const rows = (await res.json()) as Array<{ slug: string; cms_domain: string }>;
    const map: Record<string, string> = {};
    for (const r of rows) if (r.cms_domain) map[r.cms_domain.toLowerCase()] = r.slug;
    DOMAIN_CACHE = { at: Date.now(), map };
    return map;
  } catch {
    return DOMAIN_CACHE.map;
  }
}

/**
 * Refreshes the Supabase session cookie and gates protected routes.
 * Also resolves whitelabel hosts: if Host matches a site's cms_domain,
 * "/" auto-redirects into that workspace.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as CookieOptions),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Whitelabel host routing: if the request host matches a site's cms_domain,
  // rewrite "/" to "/<site-slug>" so the visitor lands in that workspace
  // directly. Everything else routes normally.
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (host && pathname === "/" && user) {
    const map = await getDomainMap(request);
    const slug = map[host];
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}
