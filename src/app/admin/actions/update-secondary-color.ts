"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import { saveServerSecondaryColor } from "@/lib/server-settings/save";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function updateSecondaryColorAction(
  hex: string,
): Promise<AdminActionResult<{ secondaryColorHex: string }>> {
  try {
    await assertPanelAdminAccess();
    const settings = await saveServerSecondaryColor(hex);
    revalidatePath("/", "layout");
    revalidatePath("/admin");
    return { ok: true, data: { secondaryColorHex: settings.secondaryColorHex } };
  } catch (error) {
    return actionError(error);
  }
}
