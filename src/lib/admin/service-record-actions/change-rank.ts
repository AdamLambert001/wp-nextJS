import {
  actorFromAccess,
  createProfileActivityLog,
} from "@/lib/admin/service-record-actions/helpers";
import { formatSubjectFromRecord } from "@/lib/admin/service-record-actions/display-utils";
import {
  noteRank,
  noteRankTransfer,
} from "@/lib/profile/log-notes";
import type { AccessContext } from "@/lib/rbac/types";
import { prisma } from "@/lib/prisma";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";
import type { SrSettings } from "@/lib/sr-settings/types";

type RankPosition = { categoryIdx: number; itemIdx: number };

function findRankPositionByName(
  rankCategories: SrSettings["rankCategories"],
  rankNameRaw: string,
): RankPosition | null {
  const rankName = String(rankNameRaw ?? "").trim().toLowerCase();
  if (!rankName) return null;

  for (let categoryIdx = 0; categoryIdx < rankCategories.length; categoryIdx += 1) {
    const items = rankCategories[categoryIdx]?.items ?? [];
    for (let itemIdx = 0; itemIdx < items.length; itemIdx += 1) {
      const label = String(items[itemIdx]?.label ?? "").trim().toLowerCase();
      if (label && label === rankName) return { categoryIdx, itemIdx };
    }
  }

  return null;
}

function resolveCooldownFromRankAbove(
  rankCategories: SrSettings["rankCategories"],
  position: RankPosition | null,
): number {
  if (!position) return 0;
  const items = rankCategories[position.categoryIdx]?.items ?? [];
  const above = items[position.itemIdx + 1];
  const parsed = Number.parseInt(String(above?.cooldown ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export type ChangeRankInput = {
  direction: "promote" | "demote";
  userIds: string[];
  targetCategoryId?: string;
};

export async function changeRank(input: ChangeRankInput, access: AccessContext) {
  const direction = String(input.direction ?? "").trim().toLowerCase() as "promote" | "demote";
  const targetCategoryId = String(input.targetCategoryId ?? "").trim();
  const userIds = Array.isArray(input.userIds)
    ? input.userIds.map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];

  if (!targetCategoryId && direction !== "promote" && direction !== "demote") {
    throw new Error("direction must be promote or demote");
  }
  if (!userIds.length) throw new Error("At least one user ID is required");
  if (userIds.length > 5) throw new Error("You can only change up to 5 users at once");

  const settings = await loadSrSettingsFromDb();
  const rankCategories = settings.rankCategories;
  const targetCatIdx = targetCategoryId
    ? rankCategories.findIndex((category) => category.id === targetCategoryId)
    : -1;

  if (targetCategoryId && targetCatIdx === -1) {
    throw new Error("Target rank category not found");
  }

  const rows = await prisma.serviceRecord.findMany({
    where: { id: { in: userIds } },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const actor = actorFromAccess(access);
  const results: Array<{
    id: string;
    ok: boolean;
    reason?: string;
    rank?: string;
    coolDown?: number;
    datePromoted?: string;
  }> = [];

  for (const id of userIds) {
    const row = byId.get(id);
    if (!row) {
      results.push({ id, ok: false, reason: "not_found" });
      continue;
    }

    const pos = findRankPositionByName(rankCategories, row.rank ?? "");
    if (!pos) {
      results.push({ id, ok: false, reason: "rank_not_mapped" });
      continue;
    }

    const oldRankStr = String(row.rank ?? "").trim();
    const oldCategoryTitle = String(rankCategories[pos.categoryIdx]?.title ?? "").trim();
    let nextRank: string;
    let nextPos: RankPosition | null;
    let isTransfer = false;

    if (targetCategoryId && targetCatIdx !== pos.categoryIdx) {
      const targetItems = rankCategories[targetCatIdx]?.items ?? [];
      if (!targetItems.length) {
        results.push({ id, ok: false, reason: "category_empty" });
        continue;
      }
      nextRank = String(targetItems[0]?.label ?? "").trim();
      nextPos = { categoryIdx: targetCatIdx, itemIdx: 0 };
      isTransfer = true;
    } else {
      const items = rankCategories[pos.categoryIdx]?.items ?? [];
      const nextIndex = direction === "promote" ? pos.itemIdx + 1 : pos.itemIdx - 1;
      if (nextIndex < 0 || nextIndex >= items.length) {
        results.push({ id, ok: false, reason: "boundary" });
        continue;
      }
      nextRank = String(items[nextIndex]?.label ?? "").trim();
      nextPos = findRankPositionByName(rankCategories, nextRank);
    }

    const coolDown = resolveCooldownFromRankAbove(rankCategories, nextPos);
    const datePromoted = new Date().toISOString();

    await prisma.serviceRecord.update({
      where: { id },
      data: {
        rank: nextRank,
        coolDown,
        datePromoted: new Date(datePromoted),
      },
    });

    results.push({ id, ok: true, rank: nextRank, coolDown, datePromoted });

    const subject = formatSubjectFromRecord(row);
    const newCategoryTitle = String(rankCategories[nextPos!.categoryIdx]?.title ?? "").trim();
    const note = isTransfer
      ? noteRankTransfer(
          subject,
          oldRankStr,
          oldCategoryTitle,
          nextRank,
          newCategoryTitle,
          actor,
        )
      : noteRank(subject, direction, oldRankStr, nextRank, actor);

    await createProfileActivityLog({
      serviceRecordId: id,
      category: "RANK",
      occurredAt: new Date(datePromoted),
      note,
    });
  }

  return { results };
}
