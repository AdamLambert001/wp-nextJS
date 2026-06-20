import { NextResponse } from "next/server";
import { getOrbatCapabilities } from "@/lib/orbat/permissions";
import { getAccessFromHeaders } from "@/lib/rbac/get-access";

export async function GET(request: Request) {
  try {
    const access = await getAccessFromHeaders(request.headers);
    const capabilities = getOrbatCapabilities(access.flags);

    return NextResponse.json({
      ok: true,
      ...capabilities,
    });
  } catch (error) {
    console.error("Failed to load ORBAT capabilities", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch ORBAT capabilities" },
      { status: 500 },
    );
  }
}
