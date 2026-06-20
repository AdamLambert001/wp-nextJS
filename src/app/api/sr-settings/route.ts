import { NextResponse } from "next/server";
import { normalizeOrbatSettings } from "@/lib/orbat/normalize";
import { orbatStructureUnchanged } from "@/lib/orbat/permissions";
import { requireAuthenticatedFromHeaders } from "@/lib/rbac/get-access";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";
import {
  canEditSrBoards,
  effectiveSrAdmin,
  hasSrStudioAccess,
  isPanelAdmin,
} from "@/lib/sr-settings/permissions";
import { saveSrSettingsWithOrbatAssignments } from "@/lib/sr-settings/save";

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

  if (body.trainingCategories !== undefined && !Array.isArray(body.trainingCategories)) {
    return NextResponse.json(
      { ok: false, message: "trainingCategories must be an array" },
      { status: 400 },
    );
  }
  if (body.rankCategories !== undefined && !Array.isArray(body.rankCategories)) {
    return NextResponse.json(
      { ok: false, message: "rankCategories must be an array" },
      { status: 400 },
    );
  }
  if (body.medals !== undefined && !Array.isArray(body.medals)) {
    return NextResponse.json(
      { ok: false, message: "medals must be an array" },
      { status: 400 },
    );
  }
  if (body.campaignRibbons !== undefined && !Array.isArray(body.campaignRibbons)) {
    return NextResponse.json(
      { ok: false, message: "campaignRibbons must be an array" },
      { status: 400 },
    );
  }
  if (
    body.orbatSettings !== undefined &&
    (typeof body.orbatSettings !== "object" || body.orbatSettings === null || Array.isArray(body.orbatSettings))
  ) {
    return NextResponse.json(
      { ok: false, message: "orbatSettings must be an object" },
      { status: 400 },
    );
  }
  if (
    body.radioChannels !== undefined &&
    (typeof body.radioChannels !== "object" ||
      body.radioChannels === null ||
      Array.isArray(body.radioChannels))
  ) {
    return NextResponse.json(
      { ok: false, message: "radioChannels must be an object" },
      { status: 400 },
    );
  }
  if (body.adminDepartments !== undefined && !Array.isArray(body.adminDepartments)) {
    return NextResponse.json(
      { ok: false, message: "adminDepartments must be an array" },
      { status: 400 },
    );
  }
  if (body.assignments !== undefined && !Array.isArray(body.assignments)) {
    return NextResponse.json(
      { ok: false, message: "assignments must be an array" },
      { status: 400 },
    );
  }
  if (
    body.assignmentPositions !== undefined &&
    (typeof body.assignmentPositions !== "object" ||
      body.assignmentPositions === null ||
      Array.isArray(body.assignmentPositions))
  ) {
    return NextResponse.json(
      { ok: false, message: "assignmentPositions must be an object" },
      { status: 400 },
    );
  }

  const panelAdmin = isPanelAdmin(access.flags);
  const canSaveBoards = canEditSrBoards(access.flags);
  const squadOnly = access.flags.srSquadLeader && !effectiveSrAdmin(access.flags);

  try {
    const current = await loadSrSettingsFromDb();

    if (squadOnly) {
      if (body.orbatSettings === undefined) {
        return NextResponse.json(
          { ok: false, message: "orbatSettings is required" },
          { status: 400 },
        );
      }
      if (
        !orbatStructureUnchanged(
          current.orbatSettings,
          normalizeOrbatSettings(body.orbatSettings),
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            message: "ORBAT structure edits are not permitted for your role.",
          },
          { status: 403 },
        );
      }
      const saved = await saveSrSettingsWithOrbatAssignments(
        { ...current, orbatSettings: body.orbatSettings },
        { applyAssignments: true },
      );
      return NextResponse.json({ ok: true, settings: saved });
    }

    if (!canSaveBoards) {
      return NextResponse.json(
        { ok: false, message: "You do not have permission to save SR settings." },
        { status: 403 },
      );
    }

    const saved = await saveSrSettingsWithOrbatAssignments(
      panelAdmin
        ? {
            trainingCategories:
              body.trainingCategories !== undefined
                ? body.trainingCategories
                : current.trainingCategories,
            rankCategories:
              body.rankCategories !== undefined ? body.rankCategories : current.rankCategories,
            medals: body.medals !== undefined ? body.medals : current.medals,
            campaignRibbons:
              body.campaignRibbons !== undefined
                ? body.campaignRibbons
                : current.campaignRibbons,
            orbatSettings:
              body.orbatSettings !== undefined ? body.orbatSettings : current.orbatSettings,
            radioChannels:
              body.radioChannels !== undefined ? body.radioChannels : current.radioChannels,
            adminDepartments:
              body.adminDepartments !== undefined
                ? body.adminDepartments
                : current.adminDepartments,
            assignments:
              body.assignments !== undefined ? body.assignments : current.assignments,
            assignmentPositions:
              body.assignmentPositions !== undefined
                ? body.assignmentPositions
                : current.assignmentPositions,
          }
        : {
            trainingCategories: current.trainingCategories,
            rankCategories:
              body.rankCategories !== undefined ? body.rankCategories : current.rankCategories,
            medals: current.medals,
            campaignRibbons: current.campaignRibbons,
            orbatSettings:
              body.orbatSettings !== undefined ? body.orbatSettings : current.orbatSettings,
            radioChannels:
              body.radioChannels !== undefined ? body.radioChannels : current.radioChannels,
            adminDepartments:
              body.adminDepartments !== undefined
                ? body.adminDepartments
                : current.adminDepartments,
            assignments:
              body.assignments !== undefined ? body.assignments : current.assignments,
            assignmentPositions:
              body.assignmentPositions !== undefined
                ? body.assignmentPositions
                : current.assignmentPositions,
          },
      { applyAssignments: body.orbatSettings !== undefined },
    );

    return NextResponse.json({ ok: true, settings: saved });
  } catch (error) {
    console.error("Failed to save SR settings", error);
    return NextResponse.json(
      { ok: false, message: "Failed to save SR settings" },
      { status: 500 },
    );
  }
}
