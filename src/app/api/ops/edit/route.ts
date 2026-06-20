import { NextResponse } from "next/server";
import { isManageOpsError, requireManageOps } from "@/lib/ops/api-auth";
import { tryUpdateOperation } from "@/lib/ops/store";

export async function POST(request: Request) {
  const access = await requireManageOps(request.headers);
  if (isManageOpsError(access)) return access;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const originalSlug = String(body.originalSlug || body.opfreindlyname || "").trim();
  if (!originalSlug) {
    return NextResponse.json(
      { ok: false, message: "originalSlug required for edit." },
      { status: 400 },
    );
  }

  const result = await tryUpdateOperation(originalSlug, body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, operation: result.operation });
}
