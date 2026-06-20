import {
  medalDisplayNameFromSlug,
} from "@/lib/admin/service-record-actions/helpers";
import {
  medalAwardLogPattern,
  normalizeAwardsTupleArray,
  removeOneMedalFromAwards,
} from "@/lib/admin/service-record-actions/awards";
import { prisma } from "@/lib/prisma";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";

async function deleteMedalActivityLogForAward(
  userId: string,
  medalName: string,
  awardedAt: string,
) {
  const logs = await prisma.profileActivityLog.findMany({
    where: { serviceRecordId: userId, category: "MEDAL" },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
  const pattern = medalAwardLogPattern(medalName, awardedAt);

  for (const log of logs) {
    if (!pattern.test(String(log.note ?? ""))) continue;
    const removed = await prisma.profileActivityLog.deleteMany({
      where: {
        id: log.id,
        serviceRecordId: userId,
        category: "MEDAL",
      },
    });
    if (removed.count) return true;
  }

  return false;
}

export type RemoveMedalInput = {
  userId: string;
  medalSlug: string;
  awardedAt: string;
};

export async function removeMedalFromUser(input: RemoveMedalInput) {
  const userId = String(input.userId ?? "").trim();
  const medalSlug = String(input.medalSlug ?? "").trim().toLowerCase();
  const awardedAt = String(input.awardedAt ?? "").trim();

  if (!userId) throw new Error("userId is required");
  if (!medalSlug) throw new Error("medalSlug is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(awardedAt)) {
    throw new Error("awardedAt must be YYYY-MM-DD");
  }

  const row = await prisma.serviceRecord.findUnique({ where: { id: userId } });
  if (!row) throw new Error("Service record not found");

  const settings = await loadSrSettingsFromDb();
  const medalName = medalDisplayNameFromSlug(settings, medalSlug);
  const { awards, removed } = removeOneMedalFromAwards(row.awards, medalSlug, awardedAt);
  if (!removed) throw new Error("Medal award not found on this member.");

  await prisma.serviceRecord.update({
    where: { id: userId },
    data: { awards },
  });

  const logRemoved = await deleteMedalActivityLogForAward(userId, medalName, awardedAt);

  return {
    userId,
    medalSlug,
    awardedAt,
    medalName,
    logRemoved,
  };
}

export type DeleteMedalInput = {
  medalSlug: string;
};

export async function deleteMedalFromCatalog(input: DeleteMedalInput) {
  const medalSlug = String(input.medalSlug ?? "").trim().toLowerCase();
  if (!medalSlug) throw new Error("medalSlug is required");

  const settings = await loadSrSettingsFromDb();
  const medal = settings.medals.find(
    (entry) => String(entry.slug ?? "").trim().toLowerCase() === medalSlug,
  );
  if (!medal) throw new Error("Medal is not defined in SR settings");

  const medalName = String(medal.displayName || medal.slug || medalSlug).trim() || medalSlug;
  const nextMedals = settings.medals.filter(
    (entry) => String(entry.slug ?? "").trim().toLowerCase() !== medalSlug,
  );

  const { saveSrSettingsWithOrbatAssignments } = await import("@/lib/sr-settings/save");
  await saveSrSettingsWithOrbatAssignments({
    ...settings,
    medals: nextMedals,
  });

  const rows = await prisma.serviceRecord.findMany();
  let profilesUpdated = 0;
  let awardsRemoved = 0;
  let logsRemoved = 0;

  for (const row of rows) {
    const awards = normalizeAwardsTupleArray(row.awards, []);
    const removedAwards = awards.filter(([slug]) => slug === medalSlug);
    if (!removedAwards.length) continue;

    const nextAwards = awards.filter(([slug]) => slug !== medalSlug);
    await prisma.serviceRecord.update({
      where: { id: row.id },
      data: { awards: nextAwards },
    });
    profilesUpdated += 1;
    awardsRemoved += removedAwards.length;

    for (const [, date] of removedAwards) {
      const deleted = await deleteMedalActivityLogForAward(row.id, medalName, date);
      if (deleted) logsRemoved += 1;
    }
  }

  return {
    medalSlug,
    medalName,
    profilesUpdated,
    awardsRemoved,
    logsRemoved,
  };
}
