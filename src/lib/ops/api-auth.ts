import { NextResponse } from "next/server";
import type { AccessContext } from "@/lib/rbac/types";
import {
  requireAccess,
  requireAccessFromHeaders,
} from "@/lib/rbac/get-access";
import { Permission } from "@/lib/rbac/permissions";

export async function requireManageOps(
  headers?: Headers,
): Promise<AccessContext | NextResponse<{ ok: false; message: string }>> {
  try {
    return headers
      ? await requireAccessFromHeaders(headers, [Permission.MANAGE_OPS])
      : await requireAccess([Permission.MANAGE_OPS]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    const status = message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ ok: false, message }, { status });
  }
}

export function isManageOpsError(
  value: Awaited<ReturnType<typeof requireManageOps>>,
): value is NextResponse<{ ok: false; message: string }> {
  return value instanceof NextResponse;
}
