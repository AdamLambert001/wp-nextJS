"use server";

import {
  assertPanelAdminAccess,
  assertSrLeadAccess,
} from "@/lib/admin/service-record-actions/auth";
import {
  listAttendanceLogsForUser,
  listMedalAwardsForUser,
} from "@/lib/admin/service-record-actions/queries";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function listAttendanceLogsAction(
  userId: string,
): Promise<AdminActionResult<Awaited<ReturnType<typeof listAttendanceLogsForUser>>>> {
  try {
    await assertSrLeadAccess();
    const data = await listAttendanceLogsForUser(userId);
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}

export async function listMedalAwardsAction(
  userId: string,
): Promise<AdminActionResult<Awaited<ReturnType<typeof listMedalAwardsForUser>>>> {
  try {
    await assertPanelAdminAccess();
    const data = await listMedalAwardsForUser(userId);
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
