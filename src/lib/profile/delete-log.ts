import type { ProfileLogCategory } from "@/generated/prisma/client";
import { loadProfileSettings } from "@/lib/profile/load";
import type { AwardTuple } from "@/lib/profile/types";
import { prisma } from "@/lib/prisma";

function parseOperationLabelFromAttendanceNote(note: string): string {
  const match = /\(Operation:\s*([^)]+)\)/i.exec(String(note ?? ""));
  return match ? String(match[1] ?? "").trim() : "";
}

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

function normalizeAwardsTupleArray(input: unknown, fallback: AwardTuple[]): AwardTuple[] {
  if (!Array.isArray(input)) return fallback;
  const out: AwardTuple[] = [];

  for (const row of input) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const slug = String(row[0] ?? "").trim().toLowerCase();
    const date = String(row[1] ?? "").trim();
    if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    out.push([slug, date]);
  }

  return out;
}

function removeOneMedalFromAwards(
  awards: unknown,
  medalSlug: string,
  awardedAt: string,
): { awards: AwardTuple[]; removed: boolean } {
  const slug = String(medalSlug ?? "").trim().toLowerCase();
  const date = String(awardedAt ?? "").trim();
  let removed = false;
  const next: AwardTuple[] = [];

  for (const row of normalizeAwardsTupleArray(awards, [])) {
    if (!removed && row[0] === slug && row[1] === date) {
      removed = true;
      continue;
    }
    next.push(row);
  }

  return { awards: next, removed };
}

function escapeRegExp(value: string): string {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseMedalFromNote(note: string): { medalName: string; awardedAt: string } | null {
  const match = /was awarded (.+?) for (\d{4}-\d{2}-\d{2})\b/i.exec(String(note ?? ""));
  if (!match) return null;
  return {
    medalName: String(match[1] ?? "").trim(),
    awardedAt: String(match[2] ?? "").trim(),
  };
}

function medalSlugFromDisplayName(
  medals: { slug: string; displayName: string }[],
  displayName: string,
): string {
  const needle = String(displayName ?? "").trim().toLowerCase();
  const match = medals.find(
    (medal) => String(medal.displayName ?? "").trim().toLowerCase() === needle,
  );
  return match ? match.slug : "";
}

async function deleteAttendanceLogSideEffects(
  userId: string,
  logId: string,
  selectedNote: string,
) {
  const row = await prisma.serviceRecord.findUnique({ where: { id: userId } });
  if (!row) {
    throw new Error("NOT_FOUND");
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

  const opLabel = parseOperationLabelFromAttendanceNote(selectedNote);
  const opSlug = await resolveOperationSlugFromAttendanceLabel(opLabel);

  let opAttendanceUnlinked = false;
  let warning = "";

  if (opSlug) {
    const logs = await prisma.profileActivityLog.findMany({
      where: { serviceRecordId: userId, category: "ATTENDANCE" },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    });

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
      const operation = await prisma.operation.findUnique({ where: { slug: opSlug } });
      if (operation) {
        await prisma.operationAttendee.deleteMany({
          where: {
            operationId: operation.id,
            serviceRecordId: userId,
          },
        });
        opAttendanceUnlinked = true;
      }
    }
  } else {
    warning =
      "Attendance removed, but linked operation attendee list could not be resolved from this log entry.";
  }

  return {
    operationCount: nextOperationCount,
    coolDown: nextCooldown,
    opAttendanceUnlinked,
    warning,
  };
}

async function deleteMedalLogSideEffects(userId: string, note: string) {
  const parsed = parseMedalFromNote(note);
  if (!parsed) return { medalRemoved: false };

  const settings = await loadProfileSettings();
  const medalSlug = medalSlugFromDisplayName(settings.medals, parsed.medalName);
  if (!medalSlug) return { medalRemoved: false };

  const row = await prisma.serviceRecord.findUnique({ where: { id: userId } });
  if (!row) throw new Error("NOT_FOUND");

  const { awards, removed } = removeOneMedalFromAwards(
    row.awards,
    medalSlug,
    parsed.awardedAt,
  );
  if (!removed) return { medalRemoved: false };

  await prisma.serviceRecord.update({
    where: { id: userId },
    data: { awards },
  });

  return { medalRemoved: true };
}

export async function deleteProfileLog(profileId: string, logId: string) {
  const userId = String(profileId ?? "").trim();
  const id = String(logId ?? "").trim();
  if (!userId || !id) {
    throw new Error("INVALID_INPUT");
  }

  const log = await prisma.profileActivityLog.findFirst({
    where: { id, serviceRecordId: userId },
  });
  if (!log) {
    throw new Error("NOT_FOUND");
  }

  let sideEffects: Record<string, unknown> = {};

  if (log.category === "ATTENDANCE") {
    sideEffects = await deleteAttendanceLogSideEffects(userId, id, log.note);
  } else if (log.category === "MEDAL") {
    sideEffects = await deleteMedalLogSideEffects(userId, log.note);
  }

  const result = await prisma.profileActivityLog.deleteMany({
    where: {
      id,
      serviceRecordId: userId,
      category: log.category as ProfileLogCategory,
    },
  });

  if (!result.count) {
    throw new Error("DELETE_FAILED");
  }

  return {
    ok: true as const,
    category: log.category,
    ...sideEffects,
  };
}

export function medalAwardLogPattern(medalName: string, awardedAt: string): RegExp {
  return new RegExp(
    `was awarded ${escapeRegExp(String(medalName ?? "").trim())} for ${escapeRegExp(String(awardedAt ?? "").trim())}\\b`,
  );
}
