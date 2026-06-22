import { normalizeOrbatSettings } from "@/lib/orbat/normalize";
import { orbatStructureUnchanged } from "@/lib/orbat/permissions";
import type { AccessContext } from "@/lib/rbac/types";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";
import {
  canEditSrBoards,
  effectiveSrAdmin,
  isPanelAdmin,
} from "@/lib/sr-settings/permissions";
import { saveSrSettingsWithOrbatAssignments } from "@/lib/sr-settings/save";
import type { SrSettings } from "@/lib/sr-settings/types";

export function validateSrSettingsPartialBody(
  body: Record<string, unknown>,
): string | null {
  if (body.trainingCategories !== undefined && !Array.isArray(body.trainingCategories)) {
    return "trainingCategories must be an array";
  }
  if (body.rankCategories !== undefined && !Array.isArray(body.rankCategories)) {
    return "rankCategories must be an array";
  }
  if (body.medals !== undefined && !Array.isArray(body.medals)) {
    return "medals must be an array";
  }
  if (body.campaignRibbons !== undefined && !Array.isArray(body.campaignRibbons)) {
    return "campaignRibbons must be an array";
  }
  if (
    body.orbatSettings !== undefined &&
    (typeof body.orbatSettings !== "object" ||
      body.orbatSettings === null ||
      Array.isArray(body.orbatSettings))
  ) {
    return "orbatSettings must be an object";
  }
  if (
    body.radioChannels !== undefined &&
    (typeof body.radioChannels !== "object" ||
      body.radioChannels === null ||
      Array.isArray(body.radioChannels))
  ) {
    return "radioChannels must be an object";
  }
  if (body.adminDepartments !== undefined && !Array.isArray(body.adminDepartments)) {
    return "adminDepartments must be an array";
  }
  if (body.assignments !== undefined && !Array.isArray(body.assignments)) {
    return "assignments must be an array";
  }
  if (
    body.assignmentPositions !== undefined &&
    (typeof body.assignmentPositions !== "object" ||
      body.assignmentPositions === null ||
      Array.isArray(body.assignmentPositions))
  ) {
    return "assignmentPositions must be an object";
  }
  return null;
}

export async function applySrSettingsPartialSave(
  access: AccessContext,
  body: Record<string, unknown>,
): Promise<SrSettings> {
  const validationError = validateSrSettingsPartialBody(body);
  if (validationError) {
    throw new Error(validationError);
  }

  const panelAdmin = isPanelAdmin(access.flags);
  const canSaveBoards = canEditSrBoards(access.flags);
  const squadOnly = access.flags.srSquadLeader && !effectiveSrAdmin(access.flags);
  const current = await loadSrSettingsFromDb();

  if (squadOnly) {
    if (body.orbatSettings === undefined) {
      throw new Error("orbatSettings is required");
    }
    if (
      !orbatStructureUnchanged(
        current.orbatSettings,
        normalizeOrbatSettings(body.orbatSettings),
      )
    ) {
      throw new Error("ORBAT structure edits are not permitted for your role.");
    }
    return saveSrSettingsWithOrbatAssignments(
      { ...current, orbatSettings: body.orbatSettings as SrSettings["orbatSettings"] },
      { applyAssignments: true },
    );
  }

  if (!canSaveBoards) {
    throw new Error("You do not have permission to save SR settings.");
  }

  const merged = panelAdmin
    ? {
        trainingCategories:
          body.trainingCategories !== undefined
            ? (body.trainingCategories as SrSettings["trainingCategories"])
            : current.trainingCategories,
        rankCategories:
          body.rankCategories !== undefined
            ? (body.rankCategories as SrSettings["rankCategories"])
            : current.rankCategories,
        medals:
          body.medals !== undefined
            ? (body.medals as SrSettings["medals"])
            : current.medals,
        campaignRibbons:
          body.campaignRibbons !== undefined
            ? (body.campaignRibbons as SrSettings["campaignRibbons"])
            : current.campaignRibbons,
        orbatSettings:
          body.orbatSettings !== undefined
            ? (body.orbatSettings as SrSettings["orbatSettings"])
            : current.orbatSettings,
        radioChannels:
          body.radioChannels !== undefined
            ? (body.radioChannels as SrSettings["radioChannels"])
            : current.radioChannels,
        adminDepartments:
          body.adminDepartments !== undefined
            ? (body.adminDepartments as SrSettings["adminDepartments"])
            : current.adminDepartments,
        assignments:
          body.assignments !== undefined
            ? (body.assignments as SrSettings["assignments"])
            : current.assignments,
        assignmentPositions:
          body.assignmentPositions !== undefined
            ? (body.assignmentPositions as SrSettings["assignmentPositions"])
            : current.assignmentPositions,
      }
    : {
        trainingCategories: current.trainingCategories,
        rankCategories:
          body.rankCategories !== undefined
            ? (body.rankCategories as SrSettings["rankCategories"])
            : current.rankCategories,
        medals: current.medals,
        campaignRibbons: current.campaignRibbons,
        orbatSettings:
          body.orbatSettings !== undefined
            ? (body.orbatSettings as SrSettings["orbatSettings"])
            : current.orbatSettings,
        radioChannels:
          body.radioChannels !== undefined
            ? (body.radioChannels as SrSettings["radioChannels"])
            : current.radioChannels,
        adminDepartments:
          body.adminDepartments !== undefined
            ? (body.adminDepartments as SrSettings["adminDepartments"])
            : current.adminDepartments,
        assignments:
          body.assignments !== undefined
            ? (body.assignments as SrSettings["assignments"])
            : current.assignments,
        assignmentPositions:
          body.assignmentPositions !== undefined
            ? (body.assignmentPositions as SrSettings["assignmentPositions"])
            : current.assignmentPositions,
      };

  return saveSrSettingsWithOrbatAssignments(merged, {
    applyAssignments: body.orbatSettings !== undefined,
  });
}
