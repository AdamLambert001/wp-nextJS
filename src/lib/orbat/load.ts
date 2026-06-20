import { ORBAT_SLOT_OPEN_ID } from "@/lib/orbat/constants";
import type {
  OrbatMemberOption,
  OrbatSettings,
  OrbatUserSummary,
  TrainingCategorySummary,
} from "@/lib/orbat/types";
import { prisma } from "@/lib/prisma";
import { mapLatestAttendanceLogByProfileIds } from "@/lib/service-records/attendance";

function parseTrainings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter(Boolean);
}

export async function loadOrbatSettingsFromDb(): Promise<OrbatSettings> {
  const categories = await prisma.orbatCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      groups: {
        orderBy: { sortOrder: "asc" },
        include: {
          positions: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  return {
    categories: categories.map((category) => ({
      id: category.localId,
      title: category.title,
      groups: category.groups.map((group) => ({
        id: group.localId,
        title: group.title,
        color: group.color,
        backgroundImage: group.backgroundImage,
        trainingCategoryId: group.trainingCategoryId,
        rows: group.positions.map((position) => ({
          id: position.localId,
          position: position.position,
          assignedUserId: position.assignedUserId,
          lastEditedAt: position.lastEditedAt,
        })),
      })),
    })),
  };
}

function collectAssignedUserIds(orbatSettings: OrbatSettings): string[] {
  const userIds = new Set<string>();

  for (const category of orbatSettings.categories) {
    for (const group of category.groups) {
      for (const row of group.rows) {
        const id = String(row.assignedUserId ?? "").trim();
        if (id && id !== ORBAT_SLOT_OPEN_ID) {
          userIds.add(id);
        }
      }
    }
  }

  return [...userIds];
}

export async function buildUsersById(
  userIds: string[],
): Promise<Record<string, OrbatUserSummary>> {
  const usersById: Record<string, OrbatUserSummary> = {};
  if (!userIds.length) {
    return usersById;
  }

  const [rows, attendanceMap] = await Promise.all([
    prisma.serviceRecord.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        rank: true,
        operationCount: true,
        coolDown: true,
        trainings: true,
      },
    }),
    mapLatestAttendanceLogByProfileIds(userIds),
  ]);

  for (const row of rows) {
    const id = String(row.id ?? "").trim();
    if (!id || !userIds.includes(id)) continue;

    const attendance = attendanceMap.get(id);
    usersById[id] = {
      id,
      displayName: String(row.displayName ?? "").trim(),
      firstName: String(row.firstName ?? "").trim(),
      lastName: String(row.lastName ?? "").trim(),
      rank: String(row.rank ?? "").trim(),
      operationCount: Number.isFinite(Number(row.operationCount))
        ? Number(row.operationCount)
        : 0,
      coolDown: Number.isFinite(Number(row.coolDown)) ? Number(row.coolDown) : 0,
      trainings: parseTrainings(row.trainings),
      lastOperationAttended: attendance ? attendance.occurredAt.toISOString() : null,
    };
  }

  return usersById;
}

export async function loadPublicOrbatData() {
  const [orbatSettings, trainingCategories] = await Promise.all([
    loadOrbatSettingsFromDb(),
    loadTrainingCategories(),
  ]);
  const userIds = collectAssignedUserIds(orbatSettings);
  const usersById = await buildUsersById(userIds);

  return {
    ok: true as const,
    orbatSettings,
    usersById,
    trainingCategories,
  };
}

export async function loadTrainingCategories(): Promise<TrainingCategorySummary[]> {
  const categories = await prisma.trainingCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return categories.map((category) => ({
    id: category.localId,
    title: category.title,
    items: category.items.map((item) => ({
      slug: item.slug,
      label: item.label,
    })),
  }));
}

export async function loadOrbatMemberOptions(): Promise<OrbatMemberOption[]> {
  const records = await prisma.serviceRecord.findMany({
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      rank: true,
    },
  });

  return records.map((record) => ({
    id: record.id,
    displayName: String(record.displayName ?? "").trim() || record.id,
    rank: record.rank,
    firstName: record.firstName,
    lastName: record.lastName,
  }));
}
