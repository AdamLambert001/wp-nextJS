import {
  extractAttendanceOperationDateIsoFromNote,
  formatBritishOrdinalDayMonthYear,
} from "@/lib/profile/formatting";
import type { AwardTuple } from "@/lib/profile/types";
import { prisma } from "@/lib/prisma";
import { mapLatestAttendanceLogByProfileIds } from "@/lib/service-records/attendance";

export type ServiceRecordDetail = {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  rank: string | null;
  assignment: string | null;
  position: string | null;
  primaryMOS: string | null;
  unit: string | null;
  operationCount: number;
  coolDown: number;
  datePromoted: string | null;
  dateJoined: string | null;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string | null;
  timezone: string | null;
  isProfilePublic: boolean;
  awards: AwardTuple[];
  trainings: string[];
  campaignRib: AwardTuple[];
};

export type ServiceRecordDetailUpdate = Omit<ServiceRecordDetail, "id">;

export type ServiceRecordCreateInput = {
  id: string;
} & ServiceRecordDetailUpdate;

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

function toDateInputValue(value: Date | null | undefined): string | null {
  if (!value) return null;
  const iso = value.toISOString();
  return iso.slice(0, 10);
}

function parseDateInputValue(value: string | null | undefined): Date | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("One or more dates are invalid.");
  }
  return parsed;
}

function mapRecordToDetail(
  row: {
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    rank: string | null;
    assignment: string | null;
    position: string | null;
    primaryMOS: string | null;
    unit: string | null;
    operationCount: number;
    coolDown: number;
    datePromoted: Date | null;
    dateJoined: Date | null;
    avatarUrl: string | null;
    bio: string | null;
    specialties: string | null;
    timezone: string | null;
    isProfilePublic: boolean;
    awards: unknown;
    trainings: unknown;
    campaignRib: unknown;
  },
): ServiceRecordDetail {
  return {
    id: row.id,
    displayName: row.displayName,
    firstName: row.firstName,
    lastName: row.lastName,
    rank: row.rank,
    assignment: row.assignment,
    position: row.position,
    primaryMOS: row.primaryMOS,
    unit: row.unit,
    operationCount: Number.isFinite(Number(row.operationCount))
      ? Number(row.operationCount)
      : 0,
    coolDown: Number.isFinite(Number(row.coolDown)) ? Number(row.coolDown) : 0,
    datePromoted: toDateInputValue(row.datePromoted),
    dateJoined: toDateInputValue(row.dateJoined),
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    specialties: row.specialties,
    timezone: row.timezone,
    isProfilePublic: row.isProfilePublic,
    awards: normalizeAwardTuples(row.awards),
    trainings: normalizeTrainings(row.trainings),
    campaignRib: normalizeAwardTuples(row.campaignRib),
  };
}

export function buildLastOperationAttended(
  attendance: { occurredAt: Date; note: string } | undefined,
): { label: string | null; sortValue: string | null } {
  if (!attendance) {
    return { label: null, sortValue: null };
  }

  const iso = extractAttendanceOperationDateIsoFromNote(
    attendance.note,
    attendance.occurredAt,
  );

  return {
    label: formatBritishOrdinalDayMonthYear(iso) || null,
    sortValue: iso || attendance.occurredAt.toISOString(),
  };
}

export async function loadServiceRecordDetail(
  id: string,
): Promise<ServiceRecordDetail | null> {
  const key = String(id ?? "").trim();
  if (!key) return null;

  const row = await prisma.serviceRecord.findUnique({ where: { id: key } });
  if (!row) return null;

  return mapRecordToDetail(row);
}

function trimNullable(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function buildServiceRecordWriteData(input: ServiceRecordDetailUpdate) {
  const operationCount = Number(input.operationCount);
  const coolDown = Number(input.coolDown);
  if (!Number.isFinite(operationCount) || operationCount < 0) {
    throw new Error("Operation count must be a non-negative number.");
  }
  if (!Number.isFinite(coolDown) || coolDown < 0) {
    throw new Error("Cooldown must be a non-negative number.");
  }

  return {
    displayName: trimNullable(input.displayName),
    firstName: trimNullable(input.firstName),
    lastName: trimNullable(input.lastName),
    rank: trimNullable(input.rank),
    assignment: trimNullable(input.assignment),
    position: trimNullable(input.position),
    primaryMOS: trimNullable(input.primaryMOS),
    unit: trimNullable(input.unit),
    operationCount: Math.round(operationCount),
    coolDown: Math.round(coolDown),
    datePromoted: parseDateInputValue(input.datePromoted),
    dateJoined: parseDateInputValue(input.dateJoined),
    avatarUrl: trimNullable(input.avatarUrl),
    bio: trimNullable(input.bio),
    specialties: trimNullable(input.specialties),
    timezone: trimNullable(input.timezone),
    isProfilePublic: Boolean(input.isProfilePublic),
    awards: normalizeAwardTuples(input.awards),
    trainings: normalizeTrainings(input.trainings),
    campaignRib: normalizeAwardTuples(input.campaignRib),
  };
}

export async function createServiceRecordDetail(
  input: ServiceRecordCreateInput,
): Promise<ServiceRecordDetail> {
  const key = String(input.id ?? "").trim();
  if (!key) {
    throw new Error("Service record ID is required.");
  }

  const existing = await prisma.serviceRecord.findUnique({ where: { id: key } });
  if (existing) {
    throw new Error("A service record with this ID already exists.");
  }

  const created = await prisma.serviceRecord.create({
    data: {
      id: key,
      ...buildServiceRecordWriteData(input),
    },
  });

  return mapRecordToDetail(created);
}

export async function updateServiceRecordDetail(
  id: string,
  input: ServiceRecordDetailUpdate,
): Promise<ServiceRecordDetail> {
  const key = String(id ?? "").trim();
  if (!key) {
    throw new Error("Service record ID is required.");
  }

  const updated = await prisma.serviceRecord.update({
    where: { id: key },
    data: buildServiceRecordWriteData(input),
  });

  return mapRecordToDetail(updated);
}

export async function deleteServiceRecordDetail(id: string): Promise<void> {
  const key = String(id ?? "").trim();
  if (!key) {
    throw new Error("Service record ID is required.");
  }

  const existing = await prisma.serviceRecord.findUnique({ where: { id: key } });
  if (!existing) {
    throw new Error("Service record not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.operationAttendee.deleteMany({ where: { serviceRecordId: key } });
    await tx.orbatPosition.updateMany({
      where: { assignedUserId: key },
      data: { assignedUserId: "" },
    });
    await tx.adminPosition.updateMany({
      where: { assignedUserId: key },
      data: { assignedUserId: "" },
    });

    if (/^\d{10,25}$/.test(key)) {
      await tx.discordRole.deleteMany({ where: { discordId: key } });
    }

    await tx.serviceRecord.delete({ where: { id: key } });
  });
}

export async function mapLastOperationAttendedByIds(
  ids: string[],
): Promise<Map<string, { label: string | null; sortValue: string | null }>> {
  const attendanceById = await mapLatestAttendanceLogByProfileIds(ids);
  const map = new Map<string, { label: string | null; sortValue: string | null }>();

  for (const id of ids) {
    map.set(id, buildLastOperationAttended(attendanceById.get(id)));
  }

  return map;
}
