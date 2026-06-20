import {
  medalDisplayNameFromSlug,
} from "@/lib/admin/service-record-actions/helpers";
import { normalizeAwardsTupleArray } from "@/lib/admin/service-record-actions/awards";
import { prisma } from "@/lib/prisma";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";

export async function listAttendanceLogsForUser(userId: string) {
  const id = String(userId ?? "").trim();
  if (!id) throw new Error("ID is required");

  const record = await prisma.serviceRecord.findUnique({ where: { id } });
  if (!record) throw new Error("Service record not found");

  const logs = await prisma.profileActivityLog.findMany({
    where: { serviceRecordId: id, category: "ATTENDANCE" },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      occurredAt: true,
      note: true,
    },
  });

  return logs.map((log) => ({
    id: log.id,
    occurredAt: log.occurredAt.toISOString(),
    note: log.note,
  }));
}

export async function listMedalAwardsForUser(userId: string) {
  const id = String(userId ?? "").trim();
  if (!id) throw new Error("ID is required");

  const record = await prisma.serviceRecord.findUnique({ where: { id } });
  if (!record) throw new Error("Service record not found");

  const settings = await loadSrSettingsFromDb();
  return normalizeAwardsTupleArray(record.awards, []).map(([medalSlug, awardedAt]) => ({
    medalSlug,
    awardedAt,
    displayName: medalDisplayNameFromSlug(settings, medalSlug),
  }));
}
