"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  deleteMedalFromCatalog,
  type DeleteMedalInput,
} from "@/lib/admin/service-record-actions/medals";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function deleteMedalAction(
  input: DeleteMedalInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof deleteMedalFromCatalog>>>> {
  try {
    await assertPanelAdminAccess();
    const data = await deleteMedalFromCatalog(input);
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
