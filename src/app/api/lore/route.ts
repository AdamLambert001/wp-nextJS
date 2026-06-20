import { NextResponse } from "next/server";
import { loadPublicUnitLoreData } from "@/lib/lore/load";
import { saveUnitLore } from "@/lib/lore/save";
import { requireAuthenticatedFromHeaders } from "@/lib/rbac/get-access";
import { canEditLore } from "@/lib/sr-settings/permissions";

export async function GET() {
  try {
    const data = await loadPublicUnitLoreData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load unit lore", error);
    return NextResponse.json(
      { ok: false, message: "Failed to load unit lore" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  let access;
  try {
    access = await requireAuthenticatedFromHeaders(request.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    const status = message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ ok: false, message }, { status });
  }

  if (!canEditLore(access.flags)) {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const lore = await saveUnitLore(body);
    return NextResponse.json({ ok: true, lore });
  } catch (error) {
    console.error("Failed to save unit lore", error);
    return NextResponse.json(
      { ok: false, message: "Failed to save unit lore" },
      { status: 500 },
    );
  }
}
