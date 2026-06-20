import {
  actorFromAccess,
  createProfileActivityLog,
  medalDisplayNameFromSlug,
} from "@/lib/admin/service-record-actions/helpers";
import { formatSubjectFromRecord } from "@/lib/admin/service-record-actions/display-utils";
import { normalizeAwardsTupleArray } from "@/lib/admin/service-record-actions/awards";
import { noteMedal, parseAwardDateToUtcMidnight } from "@/lib/profile/log-notes";
import type { AccessContext } from "@/lib/rbac/types";
import { prisma } from "@/lib/prisma";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";

export type AwardMedalInput = {
  medalSlug: string;
  awardedAt: string;
  userIds: string[];
};

export async function awardMedal(input: AwardMedalInput, access: AccessContext) {
  const medalSlug = String(input.medalSlug ?? "").trim().toLowerCase();
  const awardedAt = String(input.awardedAt ?? "").trim();
  const userIds = Array.isArray(input.userIds)
    ? input.userIds.map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];

  if (!medalSlug) throw new Error("medalSlug is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(awardedAt)) {
    throw new Error("awardedAt must be YYYY-MM-DD");
  }
  if (!userIds.length) throw new Error("At least one user ID is required");
  if (userIds.length > 5) throw new Error("You can only award up to 5 users at once");

  const settings = await loadSrSettingsFromDb();
  if (!settings.medals.some((medal) => String(medal.slug ?? "").toLowerCase() === medalSlug)) {
    throw new Error("Medal is not defined in SR settings");
  }

  const rows = await prisma.serviceRecord.findMany({
    where: { id: { in: userIds } },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const actor = actorFromAccess(access);
  const medalName = medalDisplayNameFromSlug(settings, medalSlug);
  const occurredAt = parseAwardDateToUtcMidnight(awardedAt);
  const results: Array<{ id: string; ok: boolean; reason?: string }> = [];

  for (const id of userIds) {
    const row = byId.get(id);
    if (!row) {
      results.push({ id, ok: false, reason: "not_found" });
      continue;
    }

    const awards = normalizeAwardsTupleArray(row.awards, []);
    awards.push([medalSlug, awardedAt]);

    await prisma.serviceRecord.update({
      where: { id },
      data: { awards },
    });

    results.push({ id, ok: true });
    await createProfileActivityLog({
      serviceRecordId: id,
      category: "MEDAL",
      occurredAt,
      note: noteMedal(formatSubjectFromRecord(row), medalName, awardedAt, actor),
    });
  }

  return { results };
}
