import { NextResponse } from "next/server";
import { deleteProfileLog } from "@/lib/profile/delete-log";
import { requireAccessFromHeaders } from "@/lib/rbac/get-access";
import { Permission } from "@/lib/rbac/permissions";

type RouteContext = {
  params: Promise<{ id: string; logId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAccessFromHeaders(request.headers, [
      Permission.MANAGE_SERVER,
      Permission.SR_ADMIN,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    const status = message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ ok: false, message }, { status });
  }

  const { id, logId } = await context.params;

  try {
    const result = await deleteProfileLog(id, logId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ ok: false, message: "Log entry not found" }, { status: 404 });
    }

    console.error("Failed to delete profile log", error);
    return NextResponse.json(
      { ok: false, message: "Failed to delete profile log" },
      { status: 500 },
    );
  }
}
