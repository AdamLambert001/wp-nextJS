"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  addRibbon,
  type AddRibbonInput,
} from "@/lib/admin/service-record-actions/catalog";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function addRibbonAction(
  input: AddRibbonInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof addRibbon>>>> {
  try {
    await assertPanelAdminAccess();
    const data = await addRibbon(input);
    revalidatePath("/admin");
    revalidatePath("/ranks");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
