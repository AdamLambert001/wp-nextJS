import { NextResponse } from "next/server";
import { getAccessFromHeaders } from "@/lib/rbac/get-access";
import { getSrCapabilities } from "@/lib/sr-settings/permissions";

export async function GET(request: Request) {
  try {
    const access = await getAccessFromHeaders(request.headers);
    const capabilities = getSrCapabilities(access.flags, access.authenticated);
    return NextResponse.json({ ok: true, ...capabilities });
  } catch (error) {
    console.error("Failed to load SR capabilities", error);
    return NextResponse.json(
      { ok: false, message: "Failed to determine edit capability" },
      { status: 500 },
    );
  }
}
