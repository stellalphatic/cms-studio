import { z } from "zod";

/**
 * Detect Next.js framework signals (redirect / notFound). These are
 * thrown as sentinel errors that MUST bubble up to the framework so it
 * can perform the redirect or render the 404; if we wrap them, the user
 * sees a "NEXT_REDIRECT" toast.
 *
 * Across Next versions the sentinel surfaces three different ways:
 *   - `error.message === "NEXT_REDIRECT"`
 *   - `error.digest` starts with `"NEXT_REDIRECT;"`
 *   - both
 * We accept any of them.
 */
export function isFrameworkSignal(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const message = (e as { message?: unknown }).message;
  if (typeof message === "string" && (message === "NEXT_REDIRECT" || message === "NEXT_NOT_FOUND")) {
    return true;
  }
  const digest = (e as { digest?: unknown }).digest;
  if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))) {
    return true;
  }
  return false;
}

/**
 * In production Next.js sanitises errors thrown from Server Actions into the
 * unhelpful "An error occurred in the Server Components render…" string.
 * Wrap every action body with `withAction("name", async () => …)` so that:
 *   1. The full stack is logged to stderr (visible in Vercel → Functions).
 *   2. Zod issues are reformatted into readable messages.
 *   3. The redirect / notFound signals are re-thrown unchanged.
 *   4. The client receives a clean Error with a useful message that toasts
 *      can show — no leaking of secrets, but enough to act on.
 */
export async function withAction<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isFrameworkSignal(e)) throw e;

    if (e instanceof z.ZodError) {
      const first = e.issues[0];
      const path = first?.path?.join(".") || "input";
      const msg = `${path}: ${first?.message ?? "Invalid"}`;
      console.error(`[action:${name}] validation`, JSON.stringify(e.issues, null, 2));
      throw new Error(msg);
    }

    const message = e instanceof Error ? e.message : String(e);
    console.error(`[action:${name}]`, message, e);
    throw new Error(message || `Action "${name}" failed`);
  }
}
