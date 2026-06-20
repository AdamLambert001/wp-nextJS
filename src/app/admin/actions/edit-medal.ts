"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  updateMedal,
  type UpdateMedalInput,
} from "@/lib/admin/service-record-actions/catalog";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function editMedalAction(
  input: UpdateMedalInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof updateMedal>>>> {
  try {
    await assertPanelAdminAccess();
    const data = await updateMedal(input);
    revalidatePath("/admin");
    revalidatePath("/ranks");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
