import {
  ASSET_LINK_STATUSES,
  BASE_DEFAULT_OP_META,
  BASE_TERRAIN_CONDITIONS,
  CAMPAIGN_PROGRESS_VALUES,
} from "@/lib/ops/constants";
import type {
  CampaignIntelRow,
  CampaignLinkedAsset,
  LegacyCampaign,
  LegacyOperation,
  OperationTimeRow,
  TerrainConditions,
} from "@/lib/ops/types";

export function normalizeFriendlyName(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function normalizeCampaignProgress(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if ((CAMPAIGN_PROGRESS_VALUES as readonly string[]).includes(value)) {
    return value;
  }
  return "Planned";
}

export function normalizeIsoDateOrEmpty(value: unknown): string {
  const str = String(value ?? "").trim();
  if (!str) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : "";
}

export function parseIsoDateMs(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return Number.POSITIVE_INFINITY;
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function formatIsoDateLongDisplay(ymd: string): string {
  const normalized = normalizeIsoDateOrEmpty(ymd);
  if (!normalized) return "";
  const date = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function postDateFromPostedTime(iso: string): string {
  const time = Date.parse(String(iso || ""));
  if (Number.isNaN(time)) return "";
  return new Date(time).toISOString().slice(0, 10);
}

export function mergeTerrainConditions(overrides?: Partial<TerrainConditions>): TerrainConditions {
  if (!overrides || typeof overrides !== "object") {
    return {
      ...BASE_TERRAIN_CONDITIONS,
      operationTimeTable: BASE_TERRAIN_CONDITIONS.operationTimeTable.map((row) => ({ ...row })),
    };
  }

  const operationTimeTable: OperationTimeRow[] =
    Array.isArray(overrides.operationTimeTable) && overrides.operationTimeTable.length
      ? overrides.operationTimeTable.map((row) => ({ ...row }))
      : BASE_TERRAIN_CONDITIONS.operationTimeTable.map((row) => ({ ...row }));

  return {
    ...BASE_TERRAIN_CONDITIONS,
    ...overrides,
    operationTimeTable,
  };
}

export function mergeDefaultOpMeta(overrides?: Record<string, string>) {
  return overrides && typeof overrides === "object"
    ? { ...BASE_DEFAULT_OP_META, ...overrides }
    : { ...BASE_DEFAULT_OP_META };
}

export function normalizeCampaignPayload(raw: unknown): Omit<LegacyCampaign, "id" | "slug"> | null {
  if (!raw || typeof raw !== "object") return null;

  const body = raw as Record<string, unknown>;
  const title = String(body.title || "").trim() || "Untitled campaign";
  const linkedAssets: CampaignLinkedAsset[] = [];

  for (const row of Array.isArray(body.linkedAssets) ? body.linkedAssets : []) {
    const item = row as Record<string, unknown>;
    const assetId = String(item.assetId ?? "").trim();
    if (!assetId) continue;
    let status = String(item.status ?? "Unknown").trim();
    if (!(ASSET_LINK_STATUSES as readonly string[]).includes(status)) {
      status = "Unknown";
    }
    linkedAssets.push({ assetId, status });
  }

  const additionalIntel: CampaignIntelRow[] = [];
  for (const row of Array.isArray(body.additionalIntel) ? body.additionalIntel : []) {
    const item = row as Record<string, unknown>;
    const label = String(item.label ?? item.key ?? "")
      .trim()
      .slice(0, 120);
    const value = String(item.value ?? "")
      .trim()
      .slice(0, 4000);
    if (!label && !value) continue;
    additionalIntel.push({ label: label || "Field", value });
  }

  return {
    title,
    progress: normalizeCampaignProgress(body.progress),
    startDate: normalizeIsoDateOrEmpty(body.startDate),
    endDate: normalizeIsoDateOrEmpty(body.endDate),
    loreDate: normalizeIsoDateOrEmpty(body.loreDate),
    overview: String(body.overview || "").slice(0, 200_000),
    hostileStrengthLevel: String(body.hostileStrengthLevel || "")
      .trim()
      .slice(0, 2000),
    hostileAssets: String(body.hostileAssets || "").slice(0, 50_000),
    sector: String(body.sector || "")
      .trim()
      .slice(0, 2000),
    environmentalThreats: String(body.environmentalThreats || "").slice(0, 50_000),
    linkedAssets,
    additionalIntel,
  };
}

export function parseOptionalObjectivesFromBody(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.optionalobjectives)) {
    return body.optionalobjectives
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  if (typeof body.optionalobjectives === "string") {
    return body.optionalobjectives
      .split(/\r?\n/g)
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  return [];
}

export function effectivePostCalendarDayMs(op: LegacyOperation): number {
  const postDate = normalizeIsoDateOrEmpty(op.postDate);
  if (postDate) return parseIsoDateMs(postDate);
  const time = op.postedTime ? Date.parse(String(op.postedTime)) : Number.NaN;
  if (!Number.isNaN(time)) {
    const date = new Date(time);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  return 0;
}

export function sortCampaignsByStartDate<T extends { startDate: string; title: string }>(
  campaigns: T[],
): T[] {
  return [...campaigns].sort((a, b) => {
    const dateA = parseIsoDateMs(a.startDate);
    const dateB = parseIsoDateMs(b.startDate);
    if (dateA !== dateB) return dateA - dateB;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

export function sortOperationsByPostedTimeDesc(ops: LegacyOperation[]): LegacyOperation[] {
  return [...ops].sort((a, b) => {
    const dayA = effectivePostCalendarDayMs(a);
    const dayB = effectivePostCalendarDayMs(b);
    if (dayA !== dayB) return dayB - dayA;
    const timeA = a.postedTime ? Date.parse(String(a.postedTime)) : 0;
    const timeB = b.postedTime ? Date.parse(String(b.postedTime)) : 0;
    if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
    if (Number.isNaN(timeA)) return 1;
    if (Number.isNaN(timeB)) return -1;
    return timeB - timeA;
  });
}
