import { prisma } from "@/lib/prisma";

export type AttendanceLogEntry = {
  occurredAt: Date;
  note: string;
};

export async function mapLatestAttendanceLogByProfileIds(
  ids: string[],
): Promise<Map<string, AttendanceLogEntry>> {
  const map = new Map<string, AttendanceLogEntry>();
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!uniqueIds.length) {
    return map;
  }

  const logs = await prisma.profileActivityLog.findMany({
    where: {
      category: "ATTENDANCE",
      serviceRecordId: { in: uniqueIds },
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    select: {
      serviceRecordId: true,
      occurredAt: true,
      note: true,
    },
  });

  for (const log of logs) {
    const serviceRecordId = String(log.serviceRecordId ?? "");
    if (!serviceRecordId || map.has(serviceRecordId)) continue;
    map.set(serviceRecordId, {
      occurredAt: log.occurredAt,
      note: log.note,
    });
  }

  return map;
}
