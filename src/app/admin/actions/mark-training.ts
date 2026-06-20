"use server";

import { revalidatePath } from "next/cache";
import { assertSrTrainerAccess } from "@/lib/admin/service-record-actions/auth";
import {
  markTraining,
  type MarkTrainingInput,
} from "@/lib/admin/service-record-actions/mark-training";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function markTrainingAction(
  input: MarkTrainingInput,
): Promise<AdminActionResult<{ updated: number }>> {
  try {
    const access = await assertSrTrainerAccess();
    const data = await markTraining(input, access);
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
