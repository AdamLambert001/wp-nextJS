import {
  composeProfileHeaderDisplayName,
  isValidProfileLogCategory,
  PROFILE_LOG_CATEGORY_LABELS,
} from "@/lib/profile/formatting";
import { prisma } from "@/lib/prisma";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";

export type AdminProfileLogRow = {
  id: string;
  category: string;
  categoryLabel: string;
  occurredAt: string;
  createdAt: string;
  note: string;
  serviceRecordId: string;
  memberLabel: string;
};

export type AdminOperationAttendeeRow = {
  id: string;
  serviceRecordId: string;
  memberLabel: string;
  operationSlug: string;
  operationTitle: string;
  postDate: string;
  loreDate: string;
};

export async function resolveLogViewerUserIds(userFilter: string): Promise<string[]> {
  const query = String(userFilter ?? "").trim().toLowerCase();
  if (!query) return [];

  const [rows, settings] = await Promise.all([
    prisma.serviceRecord.findMany({
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        rank: true,
      },
    }),
    loadSrSettingsFromDb(),
  ]);

  const hits: string[] = [];
  for (const row of rows) {
    const id = String(row.id ?? "").trim();
    if (!id) continue;
    const label = composeProfileHeaderDisplayName(row, settings.rankCategories);
    const hay = `${id} ${label} ${row.displayName ?? ""} ${row.firstName ?? ""} ${row.lastName ?? ""}`.toLowerCase();
    if (id.toLowerCase().includes(query) || hay.includes(query)) {
      hits.push(id);
    }
  }

  return hits;
}

export async function listAdminProfileLogs(input: {
  category?: string;
  userFilter?: string;
}): Promise<AdminProfileLogRow[]> {
  const category = String(input.category ?? "").trim();
  if (category && !isValidProfileLogCategory(category)) {
    throw new Error("Invalid category filter");
  }

  const userFilter = String(input.userFilter ?? "").trim();
  const userIds = userFilter ? await resolveLogViewerUserIds(userFilter) : [];
  if (userFilter && !userIds.length) return [];

  const logs = await prisma.profileActivityLog.findMany({
    where: {
      ...(category ? { category: category as "ATTENDANCE" | "TRAINING" | "RANK" | "MEDAL" | "RIBBON" } : {}),
      ...(userIds.length === 1
        ? { serviceRecordId: userIds[0] }
        : userIds.length > 1
          ? { serviceRecordId: { in: userIds } }
          : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 2000,
    include: {
      serviceRecord: {
        select: {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          rank: true,
        },
      },
    },
  });

  const settings = await loadSrSettingsFromDb();

  return logs.map((log) => ({
    id: log.id,
    category: log.category,
    categoryLabel: PROFILE_LOG_CATEGORY_LABELS[log.category] ?? String(log.category ?? ""),
    occurredAt: log.occurredAt.toISOString(),
    createdAt: log.createdAt.toISOString(),
    note: log.note,
    serviceRecordId: log.serviceRecordId,
    memberLabel: log.serviceRecord
      ? composeProfileHeaderDisplayName(log.serviceRecord, settings.rankCategories)
      : "",
  }));
}

export async function listAdminOperationAttendees(input: {
  userFilter?: string;
}): Promise<AdminOperationAttendeeRow[]> {
  const userFilter = String(input.userFilter ?? "").trim();
  const userIds = userFilter ? await resolveLogViewerUserIds(userFilter) : [];
  if (userFilter && !userIds.length) return [];

  const attendeeRows = await prisma.operationAttendee.findMany({
    where:
      userIds.length === 1
        ? { serviceRecordId: userIds[0] }
        : userIds.length > 1
          ? { serviceRecordId: { in: userIds } }
          : undefined,
    include: {
      operation: {
        select: {
          slug: true,
          title: true,
          postDate: true,
          loreDate: true,
        },
      },
    },
  });

  const records = await prisma.serviceRecord.findMany({
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      rank: true,
    },
  });
  const byId = new Map(records.map((row) => [row.id, row]));
  const settings = await loadSrSettingsFromDb();

  return attendeeRows.map((entry) => {
    const operation = entry.operation;
    const record = byId.get(entry.serviceRecordId) ?? null;
    return {
      id: entry.id,
      serviceRecordId: entry.serviceRecordId,
      memberLabel: record
        ? composeProfileHeaderDisplayName(record, settings.rankCategories)
        : "",
      operationSlug: String(operation?.slug ?? "").trim(),
      operationTitle: String(operation?.title ?? "").trim(),
      postDate: String(operation?.postDate ?? "").trim(),
      loreDate: String(operation?.loreDate ?? "").trim(),
    };
  });
}
