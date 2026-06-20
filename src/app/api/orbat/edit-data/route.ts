import { NextResponse } from "next/server";
import { loadOrbatMemberOptions, loadTrainingCategories } from "@/lib/orbat/load";
import { requireAccessFromHeaders } from "@/lib/rbac/get-access";
import { Permission } from "@/lib/rbac/permissions";

export async function GET(request: Request) {
  try {
    await requireAccessFromHeaders(request.headers, [
      Permission.SR_ADMIN,
      Permission.SR_SQUAD_LEADER,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    const status = message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ ok: false, message }, { status });
  }

  try {
    const [users, trainingCategories] = await Promise.all([
      loadOrbatMemberOptions(),
      loadTrainingCategories(),
    ]);

    return NextResponse.json({
      ok: true,
      users,
      trainingCategories,
    });
  } catch (error) {
    console.error("Failed to load ORBAT edit data", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch ORBAT edit data" },
      { status: 500 },
    );
  }
}
