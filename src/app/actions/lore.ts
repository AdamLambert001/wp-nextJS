"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import { saveUnitLore } from "@/lib/lore/save";
import type { UnitLore } from "@/lib/lore/types";
import { requireAuthenticated } from "@/lib/rbac/get-access";
import { canEditLore } from "@/lib/sr-settings/permissions";

export async function saveLoreAction(lore: UnitLore): Promise<ActionResult<UnitLore>> {
  try {
    const access = await requireAuthenticated();
    if (!canEditLore(access.flags)) {
      throw new Error("FORBIDDEN");
    }
    const saved = await saveUnitLore(lore);
    revalidatePath("/lore");
    return actionOk(saved);
  } catch (error) {
    console.error("Failed to save unit lore", error);
    return actionError(error);
  }
}
