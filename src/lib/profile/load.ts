import { resolveProfileAvatarUrl } from "@/lib/profile/avatar";
import { computeCampaignAttendanceForProfileId } from "@/lib/profile/campaign-attendance";
import {
  composeProfileHeaderDisplayName,
  extractAttendanceOperationDateIsoFromNote,
  formatBritishOrdinalDayMonthYear,
  isValidProfileLogCategory,
} from "@/lib/profile/formatting";
import type {
  AwardTuple,
  ProfileLogEntry,
  ProfileSettings,
  PublicProfile,
  PublicProfileRow,
} from "@/lib/profile/types";
import { prisma } from "@/lib/prisma";
import { mapLatestAttendanceLogByProfileIds } from "@/lib/service-records/attendance";

function normalizeAwardTuples(value: unknown): AwardTuple[] {
  if (!Array.isArray(value)) return [];
  const out: AwardTuple[] = [];

  for (const row of value) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const slug = String(row[0] ?? "").trim().toLowerCase();
    const date = String(row[1] ?? "").trim();
    if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    out.push([slug, date]);
  }

  return out;
}

function normalizeTrainings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter(Boolean);
}

export async function loadProfileSettings(): Promise<ProfileSettings> {
  const [medals, campaignRibbons, trainingCategories, rankCategories] =
    await Promise.all([
      prisma.medal.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.campaignRibbon.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.trainingCategory.findMany({
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.rankCategory.findMany({
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      }),
    ]);

  return {
    medals: medals.map((medal) => ({
      slug: medal.slug,
      displayName: medal.displayName,
      pictureUrl: medal.pictureUrl,
      description: medal.description,
    })),
    campaignRibbons: campaignRibbons.map((ribbon) => ({
      slug: ribbon.slug,
      displayName: ribbon.displayName,
      pictureUrl: ribbon.pictureUrl,
      description: ribbon.description,
    })),
    trainingCategories: trainingCategories.map((category) => ({
      id: category.localId,
      title: category.title,
      items: category.items.map((item) => ({
        slug: item.slug,
        label: item.label,
      })),
    })),
    rankCategories: rankCategories.map((category) => ({
      id: category.localId,
      title: category.title,
      items: category.items.map((item) => ({
        slug: item.slug,
        label: item.label,
        abbr: item.abbr,
        cooldown: item.cooldown,
        description: item.description,
        iconUrl: item.iconUrl,
      })),
    })),
  };
}

function buildLastOperationAttended(
  attendance: { occurredAt: Date; note: string } | undefined,
): string | null {
  if (!attendance) return null;
  const iso = extractAttendanceOperationDateIsoFromNote(
    attendance.note,
    attendance.occurredAt,
  );
  return formatBritishOrdinalDayMonthYear(iso) || null;
}

export async function loadPublicProfilesList(): Promise<PublicProfileRow[]> {
  const settings = await loadProfileSettings();
  const rows = await prisma.serviceRecord.findMany({
    where: { isProfilePublic: true },
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      rank: true,
      assignment: true,
      position: true,
      avatarUrl: true,
    },
  });

  const ids = rows.map((row) => row.id);
  const attendanceById = await mapLatestAttendanceLogByProfileIds(ids);

  const mapped = await Promise.all(
    rows.map(async (row) => {
      const slim = {
        id: row.id,
        displayName: row.displayName,
        firstName: row.firstName,
        lastName: row.lastName,
        rank: row.rank,
        assignment: row.assignment,
        position: row.position,
      };

      return {
        ...slim,
        profileDisplayName: composeProfileHeaderDisplayName(
          slim,
          settings.rankCategories,
        ),
        lastOperationAttended: buildLastOperationAttended(attendanceById.get(row.id)),
        avatarUrl: await resolveProfileAvatarUrl({
          id: row.id,
          avatarUrl: row.avatarUrl,
        }),
      };
    }),
  );

  return mapped.sort((a, b) =>
    String(a.profileDisplayName || a.displayName || a.id).localeCompare(
      String(b.profileDisplayName || b.displayName || b.id),
      undefined,
      { sensitivity: "base" },
    ),
  );
}

export async function loadPublicProfileById(id: string): Promise<PublicProfile | null> {
  const key = String(id ?? "").trim();
  if (!key) return null;

  const row = await prisma.serviceRecord.findUnique({ where: { id: key } });
  if (!row || !row.isProfilePublic) return null;

  const settings = await loadProfileSettings();
  const [attendanceById, campaignAttendance] = await Promise.all([
    mapLatestAttendanceLogByProfileIds([key]),
    computeCampaignAttendanceForProfileId(key),
  ]);

  const attendance = attendanceById.get(key);
  const profileBase = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    displayName: row.displayName,
    rank: row.rank,
    assignment: row.assignment,
    position: row.position,
    primaryMOS: row.primaryMOS,
    operationCount: Number.isFinite(Number(row.operationCount))
      ? Number(row.operationCount)
      : 0,
    coolDown: Number.isFinite(Number(row.coolDown)) ? Number(row.coolDown) : 0,
    datePromoted: row.datePromoted ? row.datePromoted.toISOString() : null,
    dateJoined: row.dateJoined ? row.dateJoined.toISOString() : null,
    avatarUrl: row.avatarUrl,
    awards: normalizeAwardTuples(row.awards),
    campaignRib: normalizeAwardTuples(row.campaignRib),
    trainings: normalizeTrainings(row.trainings),
  };

  return {
    ...profileBase,
    lastOperationAttended: buildLastOperationAttended(attendance),
    profileDisplayName: composeProfileHeaderDisplayName(
      profileBase,
      settings.rankCategories,
    ),
    campaignAttendance,
  };
}

export async function loadProfileLogs(
  profileId: string,
  category?: string,
): Promise<ProfileLogEntry[] | null> {
  const key = String(profileId ?? "").trim();
  if (!key) return null;

  const profile = await prisma.serviceRecord.findUnique({
    where: { id: key },
    select: { isProfilePublic: true },
  });
  if (!profile?.isProfilePublic) return null;

  const cat = String(category ?? "").trim();
  if (cat && !isValidProfileLogCategory(cat)) {
    throw new Error("INVALID_CATEGORY");
  }

  const rows = await prisma.profileActivityLog.findMany({
    where: {
      serviceRecordId: key,
      ...(cat ? { category: cat as ProfileLogEntry["category"] } : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    occurredAt: row.occurredAt.toISOString(),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }));
}
