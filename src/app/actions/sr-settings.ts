"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import { requireAuthenticated } from "@/lib/rbac/get-access";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";
import { applySrSettingsPartialSave } from "@/lib/sr-settings/apply-partial-save";
import {
  canEditSrBoards,
  hasSrStudioAccess,
} from "@/lib/sr-settings/permissions";
import type { SrSettings } from "@/lib/sr-settings/types";

function revalidateSrBoardPaths() {
  revalidatePath("/ranks");
  revalidatePath("/radios");
  revalidatePath("/admin-departments");
  revalidatePath("/orbat");
}

export async function loadSrSettingsAction(): Promise<ActionResult<SrSettings>> {
  try {
    const access = await requireAuthenticated();
    if (!hasSrStudioAccess(access.flags) && !canEditSrBoards(access.flags)) {
      throw new Error("FORBIDDEN");
    }
    const settings = await loadSrSettingsFromDb();
    return actionOk(settings);
  } catch (error) {
    console.error("Failed to load SR settings", error);
    return actionError(error);
  }
}

export async function saveSrSettingsAction(
  body: Record<string, unknown>,
): Promise<ActionResult<SrSettings>> {
  try {
    const access = await requireAuthenticated();
    const settings = await applySrSettingsPartialSave(access, body);
    revalidateSrBoardPaths();
    return actionOk(settings);
  } catch (error) {
    console.error("Failed to save SR settings", error);
    return actionError(error);
  }
}
