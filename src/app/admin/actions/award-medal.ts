"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  awardMedal,
  type AwardMedalInput,
} from "@/lib/admin/service-record-actions/award-medal";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function awardMedalAction(
  input: AwardMedalInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof awardMedal>>>> {
  try {
    const access = await assertPanelAdminAccess();
    const data = await awardMedal(input, access);
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
