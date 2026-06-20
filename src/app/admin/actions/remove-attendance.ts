"use server";

import { revalidatePath } from "next/cache";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  removeAttendance,
  type RemoveAttendanceInput,
} from "@/lib/admin/service-record-actions/remove-attendance";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function removeAttendanceAction(
  input: RemoveAttendanceInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof removeAttendance>>>> {
  try {
    await assertPanelAdminAccess();
    const data = await removeAttendance(input);
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
