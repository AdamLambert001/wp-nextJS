import { NextResponse } from "next/server";
import { isManageOpsError, requireManageOps } from "@/lib/ops/api-auth";
import { setOperationAttendees } from "@/lib/ops/store";

export async function POST(request: Request) {
  const access = await requireManageOps(request.headers);
  if (isManageOpsError(access)) return access;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const slug = String(body.opfreindlyname || body.slug || "").trim();
  const attendeeIds = Array.isArray(body.attendees)
    ? body.attendees.map((id) => String(id || "").trim()).filter(Boolean)
    : [];

  if (!slug) {
    return NextResponse.json({ ok: false, message: "Operation slug required." }, { status: 400 });
  }

  const result = await setOperationAttendees(slug, attendeeIds);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    operation: result.operation,
    added: result.added,
    removed: result.removed,
  });
}
