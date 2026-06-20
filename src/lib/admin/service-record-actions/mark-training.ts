import {
  actorFromAccess,
  createProfileActivityLog,
  trainingLabelFromSlug,
} from "@/lib/admin/service-record-actions/helpers";
import { formatSubjectFromRecord } from "@/lib/admin/service-record-actions/display-utils";
import {
  noteTraining,
  utcTodayDate,
} from "@/lib/profile/log-notes";
import type { AccessContext } from "@/lib/rbac/types";
import { prisma } from "@/lib/prisma";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";

export type MarkTrainingInput = {
  trainingSlug: string;
  userIds: string[];
};

export async function markTraining(input: MarkTrainingInput, access: AccessContext) {
  const trainingSlug = String(input.trainingSlug ?? "").trim().toLowerCase();
  const userIds = Array.isArray(input.userIds)
    ? input.userIds.map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];

  if (!trainingSlug) throw new Error("trainingSlug is required");
  if (!userIds.length) throw new Error("At least one user ID is required");
  if (userIds.length > 5) throw new Error("You can only mark up to 5 users at once");

  const settings = await loadSrSettingsFromDb();
  const allowedTrainings = new Set(
    settings.trainingCategories.flatMap((category) =>
      category.items.map((item) => String(item.slug ?? "").trim().toLowerCase()),
    ),
  );
  if (!allowedTrainings.has(trainingSlug)) {
    throw new Error("Training is not defined in SR settings");
  }

  const rows = await prisma.serviceRecord.findMany({
    where: { id: { in: userIds } },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const missing = userIds.filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`User not found: ${missing[0]}`);

  const actor = actorFromAccess(access);
  const occurredAt = utcTodayDate();
  const trainingLabel = trainingLabelFromSlug(settings, trainingSlug);

  for (const id of userIds) {
    const row = byId.get(id)!;
    const current = Array.isArray(row.trainings)
      ? row.trainings.map((value) => String(value ?? "").trim().toLowerCase()).filter(Boolean)
      : [];
    const alreadyHad = current.includes(trainingSlug);
    if (!alreadyHad) current.push(trainingSlug);

    await prisma.serviceRecord.update({
      where: { id },
      data: { trainings: current },
    });

    if (!alreadyHad) {
      await createProfileActivityLog({
        serviceRecordId: id,
        category: "TRAINING",
        occurredAt,
        note: noteTraining(formatSubjectFromRecord(row), trainingLabel, actor),
      });
    }
  }

  return { updated: userIds.length };
}
