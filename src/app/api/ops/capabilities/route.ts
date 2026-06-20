import { NextResponse } from "next/server";
import { getOpsCapabilities } from "@/lib/ops/permissions";
import { getAccessFromHeaders } from "@/lib/rbac/get-access";

export async function GET(request: Request) {
  try {
    const access = await getAccessFromHeaders(request.headers);
    const capabilities = getOpsCapabilities(access.flags, access.authenticated);
    return NextResponse.json({ ok: true, ...capabilities });
  } catch (error) {
    console.error("Failed to load ops capabilities", error);
    return NextResponse.json(
      { ok: false, message: "Failed to determine ops capability" },
      { status: 500 },
    );
  }
}
