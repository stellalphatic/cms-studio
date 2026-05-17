import { z } from "zod";

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
    // next/navigation throws these as sentinels — let them propagate untouched.
    if (e instanceof Error && (e.message === "NEXT_REDIRECT" || e.message === "NEXT_NOT_FOUND")) {
      throw e;
    }
    // Some Next sentinels expose a `digest` instead of a message.
    if (e && typeof e === "object" && "digest" in e) {
      const d = String((e as { digest: unknown }).digest ?? "");
      if (d.startsWith("NEXT_REDIRECT") || d.startsWith("NEXT_NOT_FOUND")) {
        throw e;
      }
    }

    if (e instanceof z.ZodError) {
      const first = e.issues[0];
      const path = first?.path?.join(".") || "input";
      const msg = `${path}: ${first?.message ?? "Invalid"}`;
      console.error(`[action:${name}] validation`, JSON.stringify(e.issues, null, 2));
      throw new Error(msg);
    }

    const message = e instanceof Error ? e.message : String(e);
    console.error(`[action:${name}]`, message, e);
    // Re-throw with the original message so the client toast is meaningful.
    throw new Error(message || `Action "${name}" failed`);
  }
}
