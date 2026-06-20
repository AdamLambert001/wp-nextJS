import { NextResponse } from "next/server";
import { isManageOpsError, requireManageOps } from "@/lib/ops/api-auth";
import { getAttendeePickerData } from "@/lib/ops/store";

export async function GET(request: Request) {
  const access = await requireManageOps(request.headers);
  if (isManageOpsError(access)) return access;

  try {
    const data = await getAttendeePickerData();
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error("Failed to load attendee candidates", error);
    return NextResponse.json(
      { ok: false, message: "Failed to load attendee candidates." },
      { status: 500 },
    );
  }
}
