"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  removeMedalFromUser,
  type RemoveMedalInput,
} from "@/lib/admin/service-record-actions/medals";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function removeMedalAction(
  input: RemoveMedalInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof removeMedalFromUser>>>> {
  try {
    await assertPanelAdminAccess();
    const data = await removeMedalFromUser(input);
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
