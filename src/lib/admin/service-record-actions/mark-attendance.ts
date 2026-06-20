import {
  actorFromAccess,
  createProfileActivityLog,
} from "@/lib/admin/service-record-actions/helpers";
import { formatSubjectFromRecord } from "@/lib/admin/service-record-actions/display-utils";
import { noteAttendance, parseAwardDateToUtcMidnight } from "@/lib/profile/log-notes";
import type { AccessContext } from "@/lib/rbac/types";
import {
  getEnrichedOpByFriendlyName,
  recordOperationAttendance,
} from "@/lib/ops/store";
import { prisma } from "@/lib/prisma";
import { effectiveSrAdmin } from "@/lib/sr-settings/permissions";

export type MarkAttendanceInput = {
  userIds: string[];
  operationDate: string;
  opSlug: string;
};

export type MarkAttendanceResult = {
  results: Array<{
    id: string;
    ok: boolean;
    reason?: string;
    operationCount?: number;
    coolDown?: number;
  }>;
  opSlug: string;
  operationLabel: string;
};

export async function markAttendance(
  input: MarkAttendanceInput,
  access: AccessContext,
): Promise<MarkAttendanceResult> {
  const userIds = Array.isArray(input.userIds)
    ? input.userIds.map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];
  const operationDate = String(input.operationDate ?? "").trim();
  const opSlug = String(input.opSlug ?? "").trim();

  if (!userIds.length) throw new Error("At least one user ID is required");

  const maxUsers = effectiveSrAdmin(access.flags) ? 20 : 5;
  if (userIds.length > maxUsers) {
    throw new Error(`You can only mark attendance for up to ${maxUsers} users at once`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(operationDate)) {
    throw new Error("operationDate is required and must be YYYY-MM-DD");
  }
  if (!opSlug) throw new Error("opSlug is required. Select an operation.");

  const linkedOp = await getEnrichedOpByFriendlyName(opSlug);
  if (!linkedOp) throw new Error("Selected operation could not be found.");

  const rows = await prisma.serviceRecord.findMany({
    where: { id: { in: userIds } },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const actor = actorFromAccess(access);
  const occurredAt = parseAwardDateToUtcMidnight(operationDate);
  const opLabel =
    String(linkedOp.Operationtitle || linkedOp.opfreindlyname || opSlug).trim() || opSlug;

  const results: MarkAttendanceResult["results"] = [];
  const successIds: string[] = [];

  for (const id of userIds) {
    const row = byId.get(id);
    if (!row) {
      results.push({ id, ok: false, reason: "not_found" });
      continue;
    }

    const operationCount = Number.parseInt(String(row.operationCount), 10);
    const coolDown = Number.parseInt(String(row.coolDown), 10);
    const nextOperationCount = (Number.isFinite(operationCount) ? operationCount : 0) + 1;
    const nextCooldown = Math.max(0, (Number.isFinite(coolDown) ? coolDown : 0) - 1);

    await prisma.serviceRecord.update({
      where: { id },
      data: {
        operationCount: nextOperationCount,
        coolDown: nextCooldown,
      },
    });

    results.push({
      id,
      ok: true,
      operationCount: nextOperationCount,
      coolDown: nextCooldown,
    });
    successIds.push(id);

    await createProfileActivityLog({
      serviceRecordId: id,
      category: "ATTENDANCE",
      occurredAt,
      note: noteAttendance(formatSubjectFromRecord(row), operationDate, actor, opLabel),
    });
  }

  if (successIds.length) {
    await recordOperationAttendance(opSlug, successIds);
  }

  return {
    results,
    opSlug,
    operationLabel: opLabel,
  };
}
