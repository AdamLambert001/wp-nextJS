"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  updateRibbon,
  type UpdateRibbonInput,
} from "@/lib/admin/service-record-actions/catalog";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function editRibbonAction(
  input: UpdateRibbonInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof updateRibbon>>>> {
  try {
    await assertPanelAdminAccess();
    const data = await updateRibbon(input);
    revalidatePath("/admin");
    revalidatePath("/ranks");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
