import { NextResponse } from "next/server";
import { loadOrbatSettingsFromDb, loadPublicOrbatData } from "@/lib/orbat/load";
import { normalizeOrbatSettings } from "@/lib/orbat/normalize";
import { getOrbatCapabilities, orbatStructureUnchanged } from "@/lib/orbat/permissions";
import { applyOrbatAssignments, saveOrbatSettings } from "@/lib/orbat/save";
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
  if (
    payload.orbatSettings === undefined ||
    typeof payload.orbatSettings !== "object" ||
    payload.orbatSettings === null ||
    Array.isArray(payload.orbatSettings)
  ) {
    return NextResponse.json(
      { ok: false, message: "orbatSettings must be an object" },
      { status: 400 },
    );
  }

  const incoming = normalizeOrbatSettings(payload.orbatSettings);
  const capabilities = getOrbatCapabilities(access.flags);

  if (!capabilities.canEditStructure) {
    const current = await loadOrbatSettingsFromDb();
    if (!orbatStructureUnchanged(current, incoming)) {
      return NextResponse.json(
        {
          ok: false,
          message: "You may only change ORBAT assignments, not structure.",
        },
        { status: 403 },
      );
    }
  }

  try {
    const saved = await saveOrbatSettings(incoming);
    const assignmentResult = await applyOrbatAssignments(saved);

    return NextResponse.json({
      ok: true,
      orbatSettings: saved,
      assignmentResult,
    });
  } catch (error) {
    console.error("Failed to save ORBAT settings", error);
    return NextResponse.json(
      { ok: false, message: "Failed to save ORBAT settings" },
      { status: 500 },
    );
  }
}
