"use server";

import { assertEffectiveSrAdminAccess } from "@/lib/admin/service-record-actions/auth";
import {
  listAdminOperationAttendees,
  listAdminProfileLogs,
} from "@/lib/admin/log-viewer";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function listAdminProfileLogsAction(input: {
  category?: string;
  userFilter?: string;
}): Promise<AdminActionResult<Awaited<ReturnType<typeof listAdminProfileLogs>>>> {
  try {
    await assertEffectiveSrAdminAccess();
    const data = await listAdminProfileLogs(input);
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}

export async function listAdminOperationAttendeesAction(input: {
  userFilter?: string;
}): Promise<AdminActionResult<Awaited<ReturnType<typeof listAdminOperationAttendees>>>> {
  try {
    await assertEffectiveSrAdminAccess();
    const data = await listAdminOperationAttendees(input);
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
