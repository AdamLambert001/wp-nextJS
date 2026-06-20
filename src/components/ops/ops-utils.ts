import type { LegacyCampaign, LegacyOperation } from "@/lib/ops/types";

const MONTHS = [
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
] as const;

export function formatCampaignIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!match) return String(iso || "").trim();
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11) return String(iso || "").trim();
  return `${day} ${MONTHS[month]} ${year}`;
}

export function formatCampaignLoreMonthYear(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return "";
  return `${MONTHS[month]} ${year}`;
}

export function formatPostDateYmd(ymd: string): string {
  const value = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function postCalendarDayMs(op: LegacyOperation): number {
  const postDate = String(op.postDate || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(postDate)) {
    const year = Number(postDate.slice(0, 4));
    const month = Number(postDate.slice(5, 7)) - 1;
    const day = Number(postDate.slice(8, 10));
    return Date.UTC(year, month, day);
  }
  const time = op.postedTime ? Date.parse(String(op.postedTime)) : Number.NaN;
  if (!Number.isNaN(time)) {
    const date = new Date(time);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  return 0;
}

export function utcDayMsFromIsoDate(ymd: string): number {
  const value = String(ymd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 0;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7)) - 1;
  const day = Number(value.slice(8, 10));
  return Date.UTC(year, month, day);
}

export function yyyymmFromUtcDayMs(ms: number): string {
  if (!ms) return "";
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthHeadingFromYyyymm(key: string): string {
  if (!key || key === "0000-00") return "Undated";
  const [yearPart, monthPart] = String(key).split("-");
  const year = Number(yearPart);
  const month = Number(monthPart) - 1;
  if (month < 0 || month > 11 || Number.isNaN(year)) return key;
  return `${MONTHS[month]} ${year}`;
}

export function campaignListMonthKey(camp: LegacyCampaign, nestedOps: LegacyOperation[]): string {
  const startMs = utcDayMsFromIsoDate(camp.startDate);
  if (startMs) return yyyymmFromUtcDayMs(startMs);
  let earliest = 0;
  for (const op of nestedOps) {
    const ms = postCalendarDayMs(op);
    if (ms > 0 && (!earliest || ms < earliest)) earliest = ms;
  }
  if (earliest) return yyyymmFromUtcDayMs(earliest);
  return "0000-00";
}

export function campaignListSortDayMs(
  camp: LegacyCampaign,
  nestedOps: LegacyOperation[],
): number {
  const startMs = utcDayMsFromIsoDate(camp.startDate);
  if (startMs) return startMs;
  let best = 0;
  for (const op of nestedOps) {
    const ms = postCalendarDayMs(op);
    if (ms > best) best = ms;
  }
  return best;
}

export function progressBadgeClass(progress: string): string {
  const value = String(progress || "Planned").trim();
  if (value === "In-Progress") return "ops-progress--in-progress";
  if (value === "Completed") return "ops-progress--completed";
  return "ops-progress--planned";
}

export function chipClassForStatus(status: string): string {
  const value = String(status || "Unknown").trim();
  if (value === "Destroyed" || value === "Eliminated") return "ops-chip--red";
  if (value === "Fleeing") return "ops-chip--blue";
  if (value === "In-Contact") return "ops-chip--amber";
  if (value === "Active") return "ops-chip--green";
  return "ops-chip--neutral";
}

export function truncateText(text: string, maxChars: number): string {
  const value = String(text || "");
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trimEnd()}…`;
}

export function sanitizeUrl(href: string): string {
  const value = String(href || "").trim();
  if (!value) return "";
  if (value.startsWith("/")) {
    if (value.startsWith("//")) return "";
    return value;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    return "";
  }
  return "";
}

export type MonthEntry =
  | { kind: "op"; op: LegacyOperation }
  | { kind: "campaign"; camp: LegacyCampaign; nested: LegacyOperation[] };

export function buildMonthGroups(
  campaigns: LegacyCampaign[],
  operations: LegacyOperation[],
): Map<string, MonthEntry[]> {
  const campaignIds = new Set(campaigns.map((campaign) => campaign.id).filter(Boolean));
  const unassigned = operations.filter((op) => {
    const campaignId = String(op.campaignId || "").trim();
    return !campaignId || !campaignIds.has(campaignId);
  });

  const byMonth = new Map<string, MonthEntry[]>();
  const pushEntry = (monthKey: string, entry: MonthEntry) => {
    const key = monthKey || "0000-00";
    const list = byMonth.get(key) ?? [];
    list.push(entry);
    byMonth.set(key, list);
  };

  for (const op of unassigned) {
    const ms = postCalendarDayMs(op);
    pushEntry(ms ? yyyymmFromUtcDayMs(ms) : "0000-00", { kind: "op", op });
  }

  for (const camp of campaigns) {
    if (!camp.id) continue;
    const nested = operations.filter(
      (op) => String(op.campaignId || "").trim() === camp.id,
    );
    pushEntry(campaignListMonthKey(camp, nested), { kind: "campaign", camp, nested });
  }

  return byMonth;
}

export function sortMonthEntries(entries: MonthEntry[]): MonthEntry[] {
  return [...entries].sort((a, b) => {
    const dayA =
      a.kind === "op"
        ? postCalendarDayMs(a.op)
        : campaignListSortDayMs(a.camp, a.nested);
    const dayB =
      b.kind === "op"
        ? postCalendarDayMs(b.op)
        : campaignListSortDayMs(b.camp, b.nested);
    if (dayA !== dayB) return dayB - dayA;
    const titleA =
      a.kind === "op"
        ? String(a.op.Operationtitle || a.op.opfreindlyname || "")
        : String(a.camp.title || "");
    const titleB =
      b.kind === "op"
        ? String(b.op.Operationtitle || b.op.opfreindlyname || "")
        : String(b.camp.title || "");
    return titleA.localeCompare(titleB);
  });
}

export function plainTextFromOpsMarkdown(text: string, maxLength = 320): string {
  return String(text ?? "")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/[#*_`~]/g, "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
