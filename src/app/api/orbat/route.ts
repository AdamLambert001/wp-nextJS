import { NextResponse } from "next/server";
import { loadPublicOrbatData } from "@/lib/orbat/load";
import { applyOrbatSave } from "@/lib/orbat/apply-save";
import { requireAccessFromHeaders } from "@/lib/rbac/get-access";
import { Permission } from "@/lib/rbac/permissions";

export async function GET() {
  try {
    const data = await loadPublicOrbatData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load ORBAT data", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch ORBAT data" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  let access;
  try {
    access = await requireAccessFromHeaders(request.headers, [
      Permission.SR_ADMIN,
      Permission.SR_SQUAD_LEADER,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    const status = message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ ok: false, message }, { status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as { orbatSettings?: unknown };

  try {
    const result = await applyOrbatSave(access, payload.orbatSettings);
    return NextResponse.json({
      ok: true,
      orbatSettings: result.orbatSettings,
      assignmentResult: result.assignmentResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save ORBAT settings";
    const status =
      message === "orbatSettings must be an object" ||
      message === "You may only change ORBAT assignments, not structure."
        ? message === "orbatSettings must be an object"
          ? 400
          : 403
        : 500;
    if (status === 500) {
      console.error("Failed to save ORBAT settings", error);
    }
    return NextResponse.json({ ok: false, message }, { status });
  }
}
