"use server";

import { revalidatePath } from "next/cache";
import { assertSrSquadLeaderBulkAccess } from "@/lib/admin/service-record-actions/auth";
import {
  markAttendance,
  type MarkAttendanceInput,
  type MarkAttendanceResult,
} from "@/lib/admin/service-record-actions/mark-attendance";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function markAttendanceAction(
  input: MarkAttendanceInput,
): Promise<AdminActionResult<MarkAttendanceResult>> {
  try {
    const access = await assertSrSquadLeaderBulkAccess();
    const data = await markAttendance(input, access);
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
