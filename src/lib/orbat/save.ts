import { ORBAT_SLOT_OPEN_ID } from "@/lib/orbat/constants";
import type { OrbatSettings } from "@/lib/orbat/types";
import { prisma } from "@/lib/prisma";

const TRANSACTION_TIMEOUT_MS = 60_000;

export async function saveOrbatSettings(orbatSettings: OrbatSettings): Promise<OrbatSettings> {
  await prisma.$transaction(
    async (tx) => {
      await tx.orbatPosition.deleteMany();
      await tx.orbatGroup.deleteMany();
      await tx.orbatCategory.deleteMany();

      for (let categoryIndex = 0; categoryIndex < orbatSettings.categories.length; categoryIndex += 1) {
        const category = orbatSettings.categories[categoryIndex];
        await tx.orbatCategory.create({
          data: {
            localId: category.id,
            title: category.title,
            sortOrder: categoryIndex,
            groups: {
              create: category.groups.map((group, groupIndex) => ({
                localId: group.id,
                title: group.title,
                color: group.color || "",
                backgroundImage: group.backgroundImage || "",
                trainingCategoryId: group.trainingCategoryId || "",
                sortOrder: groupIndex,
                positions: {
                  createMany: {
                    data: group.rows.map((row, rowIndex) => ({
                      localId: row.id,
                      position: row.position,
                      assignedUserId: row.assignedUserId || "",
                      lastEditedAt: row.lastEditedAt || "",
                      sortOrder: rowIndex,
                    })),
                  },
                },
              })),
            },
          },
        });
      }
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );

  return orbatSettings;
}

export async function applyOrbatAssignments(orbatSettings: OrbatSettings) {
  const winners = new Map<
    string,
    { userId: string; assignment: string; position: string; editedAtMs: number; traversal: number }
  >();
  let traversal = 0;

  for (const category of orbatSettings.categories) {
    for (const group of category.groups) {
      for (const row of group.rows) {
        traversal += 1;
        const userId = String(row.assignedUserId ?? "").trim();
        if (!userId || userId === ORBAT_SLOT_OPEN_ID) continue;

        const position = String(row.position ?? "").trim();
        const assignment = String(group.title ?? "").trim();
        if (!position || !assignment) continue;

        const timestamp = Date.parse(String(row.lastEditedAt ?? ""));
        const editedAtMs = Number.isFinite(timestamp) ? timestamp : 0;
        const current = winners.get(userId);

        if (
          !current ||
          editedAtMs > current.editedAtMs ||
          (editedAtMs === current.editedAtMs && traversal > current.traversal)
        ) {
          winners.set(userId, {
            userId,
            assignment,
            position,
            editedAtMs,
            traversal,
          });
        }
      }
    }
  }

  if (!winners.size) {
    return { updated: 0, skipped: 0 };
  }

  const rows = await prisma.serviceRecord.findMany({
    select: {
      id: true,
      assignment: true,
      position: true,
    },
  });
  const byId = new Map(rows.map((row) => [String(row.id ?? ""), row]));

  let updated = 0;
  let skipped = 0;

  for (const winner of winners.values()) {
    const row = byId.get(winner.userId);
    if (!row) {
      skipped += 1;
      continue;
    }

    const currentAssignment = String(row.assignment ?? "").trim();
    const currentPosition = String(row.position ?? "").trim();
    if (
      currentAssignment === winner.assignment &&
      currentPosition === winner.position
    ) {
      continue;
    }

    await prisma.serviceRecord.update({
      where: { id: winner.userId },
      data: {
        assignment: winner.assignment,
        position: winner.position,
      },
    });
    updated += 1;
  }

  return { updated, skipped };
}
