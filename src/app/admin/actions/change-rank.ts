"use server";

import { revalidatePath } from "next/cache";
import { assertSrSquadLeaderBulkAccess } from "@/lib/admin/service-record-actions/auth";
import {
  changeRank,
  type ChangeRankInput,
} from "@/lib/admin/service-record-actions/change-rank";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function changeRankAction(
  input: ChangeRankInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof changeRank>>>> {
  try {
    const access = await assertSrSquadLeaderBulkAccess();
    const data = await changeRank(input, access);
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
