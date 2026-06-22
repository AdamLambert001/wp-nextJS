import { NextResponse } from "next/server";
import { requireAuthenticatedFromHeaders } from "@/lib/rbac/get-access";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";
import { applySrSettingsPartialSave } from "@/lib/sr-settings/apply-partial-save";
import {
  canEditSrBoards,
  hasSrStudioAccess,
} from "@/lib/sr-settings/permissions";

export async function GET(request: Request) {
  let access;
  try {
    access = await requireAuthenticatedFromHeaders(request.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    const status = message === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ ok: false, message }, { status });
  }

  if (!hasSrStudioAccess(access.flags) && !canEditSrBoards(access.flags)) {
    return NextResponse.json({ ok: false, message: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const settings = await loadSrSettingsFromDb();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("Failed to load SR settings", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch SR settings" },
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const saved = await applySrSettingsPartialSave(access, body);
    return NextResponse.json({ ok: true, settings: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save SR settings";
    const status =
      message === "FORBIDDEN" ||
      message === "You do not have permission to save SR settings." ||
      message === "ORBAT structure edits are not permitted for your role." ||
      message === "You may only change ORBAT assignments, not structure."
        ? 403
        : message.includes("must be")
          ? 400
          : 500;
    if (status === 500) {
      console.error("Failed to save SR settings", error);
      return NextResponse.json(
        { ok: false, message: "Failed to save SR settings" },
        { status },
      );
    }
    return NextResponse.json({ ok: false, message }, { status });
  }
}
