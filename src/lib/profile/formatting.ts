import type { RankCategoryDefinition } from "@/lib/profile/types";

export const PROFILE_LOG_CATEGORIES = [
  "ATTENDANCE",
  "TRAINING",
  "RANK",
  "MEDAL",
  "RIBBON",
] as const;

export const PROFILE_LOG_CATEGORY_LABELS: Record<string, string> = {
  ATTENDANCE: "Attendance",
  TRAINING: "Training",
  RANK: "Promotions",
  MEDAL: "Medals",
  RIBBON: "Ribbons",
};

const ATTENDED_FOR_ISO_RE = /marked attended for (\d{4}-\d{2}-\d{2})\b/;

export function isValidProfileLogCategory(value: string): boolean {
  return PROFILE_LOG_CATEGORIES.includes(
    value as (typeof PROFILE_LOG_CATEGORIES)[number],
  );
}

export function findRankCategoryIndex(
  rankCategories: RankCategoryDefinition[],
  rankNameRaw: string,
): number {
  const rankName = String(rankNameRaw ?? "").trim().toLowerCase();
  if (!rankName) return -1;

  for (let categoryIdx = 0; categoryIdx < rankCategories.length; categoryIdx += 1) {
    for (const item of rankCategories[categoryIdx]?.items ?? []) {
      const label = String(item.label ?? "").trim().toLowerCase();
      if (label && label === rankName) return categoryIdx;
    }
  }

  return -1;
}

export function resolveRankAbbr(
  rankCategories: RankCategoryDefinition[],
  fullRank: string,
): string {
  const rankNeedle = String(fullRank ?? "").trim().toLowerCase();
  if (!rankNeedle) return "";

  for (const category of rankCategories) {
    for (const item of category.items) {
      const label = String(item.label ?? "").trim().toLowerCase();
      if (label && label === rankNeedle) {
        return String(item.abbr ?? "").trim();
      }
    }
  }

  return "";
}

export function composeProfileHeaderDisplayName(
  profile: {
    id?: string;
    rank?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
  },
  rankCategories: RankCategoryDefinition[],
): string {
  const rankFull = String(profile.rank ?? "").trim();
  const rankAbbr = resolveRankAbbr(rankCategories, rankFull);
  const firstName = String(profile.firstName ?? "").trim();
  const lastName = String(profile.lastName ?? "").trim();
  const nickname = String(profile.displayName ?? "").trim();
  const firstInitialSource = firstName || nickname;
  const firstInitial = firstInitialSource
    ? `${firstInitialSource.charAt(0).toUpperCase()}.`
    : "";
  const rankPart = rankAbbr ? `${rankAbbr}.` : rankFull;
  const nicknamePart = nickname ? `"${nickname}"` : "";
  const parts = [rankPart, firstInitial, nicknamePart, lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);

  if (parts.length) return parts.join(" ");
  return String(profile.id ?? "").trim() || "Service Profile";
}

export function composeOverviewName(profile: {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}): string {
  const firstName = String(profile.firstName ?? "").trim();
  const lastName = String(profile.lastName ?? "").trim();
  const nickname = String(profile.displayName ?? "").trim();
  const base = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (base && nickname) return `${base} ("${nickname}")`;
  if (base) return base;
  if (nickname) return `"${nickname}"`;
  return profile.id ? String(profile.id) : "-";
}

export function extractAttendanceOperationDateIsoFromNote(
  note: string,
  occurredAt: Date | string,
): string {
  const match = ATTENDED_FOR_ISO_RE.exec(String(note ?? ""));
  if (match) return match[1];

  const date = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ordinalSuffix(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

export function formatBritishOrdinalDayMonthYear(isoYyyyMmDd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoYyyyMmDd ?? "").trim());
  if (!match) return "";

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const dayNum = Number(match[3]);
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11 || !Number.isFinite(dayNum)) {
    return "";
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return `${dayNum}${ordinalSuffix(dayNum)} ${months[monthIndex]} ${year}`;
}

export function formatTimeInUnit(dateJoined: string | null | undefined): string {
  if (!dateJoined) return "-";
  const start = new Date(dateJoined);
  if (Number.isNaN(start.getTime())) return "-";

  const end = new Date();
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (endDate < startDate) return "0 days";

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "0 days";

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "0 days";
}

export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function logCategoryClassName(category: string): string {
  switch (category) {
    case "ATTENDANCE":
      return "border-l-blue-500";
    case "TRAINING":
      return "border-l-orange-500";
    case "RANK":
      return "border-l-green-500";
    case "MEDAL":
      return "border-l-yellow-500";
    case "RIBBON":
      return "border-l-cyan-500";
    default:
      return "border-l-border";
  }
}
