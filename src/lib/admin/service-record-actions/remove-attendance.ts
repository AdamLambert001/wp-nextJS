import { parseOperationLabelFromAttendanceNote } from "@/lib/admin/service-record-actions/display-utils";
import { removeOperationAttendance } from "@/lib/ops/store";
import { prisma } from "@/lib/prisma";

function normalizeOpLookupToken(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveOperationSlugFromAttendanceLabel(label: string): Promise<string> {
  const raw = String(label ?? "").trim();
  if (!raw) return "";

  const slugNeedle = normalizeOpLookupToken(raw);
  const lowerNeedle = raw.toLowerCase();
  const operations = await prisma.operation.findMany({
    select: { slug: true, title: true },
  });

  for (const operation of operations) {
    const opSlug = String(operation.slug ?? "").trim();
    const opTitle = String(operation.title ?? "").trim();
    if (opSlug && normalizeOpLookupToken(opSlug) === slugNeedle) return opSlug;
    if (opTitle && opTitle.toLowerCase() === lowerNeedle) return opSlug;
  }

  return "";
}

export type RemoveAttendanceInput = {
  userId: string;
  logId: string;
};

export async function removeAttendance(input: RemoveAttendanceInput) {
  const userId = String(input.userId ?? "").trim();
  const logId = String(input.logId ?? "").trim();

  if (!userId) throw new Error("userId is required");
  if (!logId) throw new Error("logId is required");

  const row = await prisma.serviceRecord.findUnique({ where: { id: userId } });
  if (!row) throw new Error("Service record not found");

  const logs = await prisma.profileActivityLog.findMany({
    where: { serviceRecordId: userId, category: "ATTENDANCE" },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  const selected = logs.find((entry) => String(entry.id ?? "").trim() === logId);
  if (!selected) {
    throw new Error("Attendance log entry not found for selected member.");
  }

  const operationCount = Number.parseInt(String(row.operationCount), 10);
  const coolDown = Number.parseInt(String(row.coolDown), 10);
  const nextOperationCount = Math.max(
    0,
    (Number.isFinite(operationCount) ? operationCount : 0) - 1,
  );
  const nextCooldown = (Number.isFinite(coolDown) ? coolDown : 0) + 1;

  await prisma.serviceRecord.update({
    where: { id: userId },
    data: {
      operationCount: nextOperationCount,
      coolDown: nextCooldown,
    },
  });

  const removedCount = await prisma.profileActivityLog.deleteMany({
    where: {
      id: logId,
      serviceRecordId: userId,
      category: "ATTENDANCE",
    },
  });
  if (!removedCount.count) {
    throw new Error("Attendance log could not be removed. Please refresh and retry.");
  }

  const opLabel = parseOperationLabelFromAttendanceNote(selected.note);
  const opSlug = await resolveOperationSlugFromAttendanceLabel(opLabel);
  let opAttendanceUnlinked = false;
  let warning = "";

  if (opSlug) {
    let hasOtherForSameOp = false;
    for (const entry of logs) {
      if (!entry || String(entry.id ?? "").trim() === logId) continue;
      const entryLabel = parseOperationLabelFromAttendanceNote(entry.note);
      if (!entryLabel) continue;
      const entrySlug = await resolveOperationSlugFromAttendanceLabel(entryLabel);
      if (entrySlug === opSlug) {
        hasOtherForSameOp = true;
        break;
      }
    }

    if (!hasOtherForSameOp) {
      await removeOperationAttendance(opSlug, [userId]);
      opAttendanceUnlinked = true;
    }
  } else {
    warning =
      "Attendance removed, but linked operation attendee list could not be resolved from this log entry.";
  }

  return {
    userId,
    logId,
    operationCount: nextOperationCount,
    coolDown: nextCooldown,
    operationLabel: opLabel,
    operationSlug: opSlug,
    opAttendanceUnlinked,
    warning,
  };
}
