import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Match everything EXCEPT static assets, the public API (/api/v1/* is the
    // headless surface every client site reads from and POSTs forms to —
    // authenticated via Bearer tokens inside the route handler when keys
    // exist), and direct asset paths.
    "/((?!_next/static|_next/image|favicon.ico|brands/|api/v1/|api/public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
