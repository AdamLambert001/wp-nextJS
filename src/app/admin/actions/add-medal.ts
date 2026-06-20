"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  addMedal,
  type AddMedalInput,
} from "@/lib/admin/service-record-actions/catalog";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function addMedalAction(
  input: AddMedalInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof addMedal>>>> {
  try {
    await assertPanelAdminAccess();
    const data = await addMedal(input);
    revalidatePath("/admin");
    revalidatePath("/ranks");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
