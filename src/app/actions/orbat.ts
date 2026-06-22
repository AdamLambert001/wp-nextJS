"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import { loadOrbatMemberOptions, loadTrainingCategories } from "@/lib/orbat/load";
import { applyOrbatSave } from "@/lib/orbat/apply-save";
import type { OrbatMemberOption, OrbatSettings, TrainingCategorySummary } from "@/lib/orbat/types";
import { requireAccess } from "@/lib/rbac/get-access";
import { Permission } from "@/lib/rbac/permissions";

export type OrbatEditData = {
  users: OrbatMemberOption[];
  trainingCategories: TrainingCategorySummary[];
};

export async function loadOrbatEditDataAction(): Promise<ActionResult<OrbatEditData>> {
  try {
    await requireAccess([Permission.SR_ADMIN, Permission.SR_SQUAD_LEADER]);
    const [users, trainingCategories] = await Promise.all([
      loadOrbatMemberOptions(),
      loadTrainingCategories(),
    ]);
    return actionOk({ users, trainingCategories });
  } catch (error) {
    console.error("Failed to load ORBAT edit data", error);
    return actionError(error);
  }
}

export async function saveOrbatAction(
  orbatSettings: OrbatSettings,
): Promise<ActionResult<{ orbatSettings: OrbatSettings }>> {
  try {
    const access = await requireAccess([Permission.SR_ADMIN, Permission.SR_SQUAD_LEADER]);
    const result = await applyOrbatSave(access, orbatSettings);
    revalidatePath("/orbat");
    return actionOk({ orbatSettings: result.orbatSettings });
  } catch (error) {
    console.error("Failed to save ORBAT settings", error);
    return actionError(error);
  }
}
