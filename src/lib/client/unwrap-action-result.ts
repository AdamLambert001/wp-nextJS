export type { ActionResult } from "@/lib/actions/result";

export function unwrapActionResult<T>(
  result: { ok: true; data: T } | { ok: false; message: string },
): T {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.data;
}
