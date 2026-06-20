"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  awardRibbon,
  type AwardRibbonInput,
} from "@/lib/admin/service-record-actions/award-ribbon";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function awardRibbonAction(
  input: AwardRibbonInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof awardRibbon>>>> {
  try {
    const access = await assertPanelAdminAccess();
    const data = await awardRibbon(input, access);
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
