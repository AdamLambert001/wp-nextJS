import type { Prisma } from "@/generated/prisma/client";
import { BASE_TERRAIN_CONDITIONS } from "@/lib/ops/constants";
import {
  formatIsoDateLongDisplay,
  mergeDefaultOpMeta,
  mergeTerrainConditions,
  normalizeCampaignPayload,
  normalizeFriendlyName,
  normalizeIsoDateOrEmpty,
  parseOptionalObjectivesFromBody,
  postDateFromPostedTime,
  sortCampaignsByStartDate,
  sortOperationsByPostedTimeDesc,
} from "@/lib/ops/normalize";
import type {
  LegacyCampaign,
  LegacyOperation,
  OpsDashboardBundle,
  TerrainConditions,
} from "@/lib/ops/types";
import { loadOrbatSettingsFromDb } from "@/lib/orbat/load";
import { prisma } from "@/lib/prisma";

const TERRAIN_CONDITIONS = mergeTerrainConditions();
const DEFAULT_OP_META = mergeDefaultOpMeta();

const operationInclude = { attendees: true } as const;
const campaignInclude = { linkedAssets: true } as const;
const campaignOrderBy = [{ startDate: "asc" as const }, { title: "asc" as const }];

type DbOperation = Prisma.OperationGetPayload<{ include: typeof operationInclude }>;
type DbCampaign = Prisma.CampaignGetPayload<{ include: typeof campaignInclude }>;

function dbOpToLegacy(row: DbOperation): LegacyOperation {
  return {
    Operationtitle: row.title,
    opfreindlyname: row.slug,
    postDate: row.postDate || "",
    loreDate: row.loreDate || "",
    date: row.legacyDate || "",
    planet: row.planet || "",
    sector: row.sector || "",
    opposingforce: row.opposingForce || "",
    postedTime: row.postedTime ? row.postedTime.toISOString() : "",
    missionstatement: row.missionStatement || "",
    opdescription: row.description || "",
    mainobjective: row.mainObjective || "",
    secondaryobjective: row.secondaryObjective || "",
    optionalobjectives: Array.isArray(row.optionalObjectives)
      ? (row.optionalObjectives as string[])
      : [],
    terrainConditions:
      row.terrainConditions && typeof row.terrainConditions === "object"
        ? (row.terrainConditions as TerrainConditions)
        : mergeTerrainConditions(),
    attendees: (row.attendees || []).map((attendee) => attendee.serviceRecordId),
    campaignId: row.campaignId || undefined,
  };
}

function dbCampaignToLegacy(row: DbCampaign): LegacyCampaign {
  const additionalIntel = Array.isArray(row.additionalIntel)
    ? (row.additionalIntel as LegacyCampaign["additionalIntel"])
    : [];

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    progress: row.progress,
    startDate: row.startDate,
    endDate: row.endDate,
    loreDate: row.loreDate,
    overview: row.overview,
    hostileStrengthLevel: row.hostileStrengthLevel,
    hostileAssets: row.hostileAssets,
    sector: row.sector,
    environmentalThreats: row.environmentalThreats,
    linkedAssets: (row.linkedAssets || []).map((asset) => ({
      assetId: asset.assetId,
      status: asset.status,
    })),
    additionalIntel,
  };
}

function buildCampaignIdMap(campaigns: LegacyCampaign[]) {
  const map = new Map<string, LegacyCampaign>();
  for (const campaign of campaigns) {
    if (campaign.id) map.set(campaign.id, campaign);
  }
  return map;
}

async function allocateUniqueCampaignSlug(
  preferredBase: string,
  excludeId?: string,
): Promise<string> {
  let base = normalizeFriendlyName(preferredBase);
  if (!base) base = "campaign";
  const exclude = excludeId?.trim() ?? "";
  let slug = base;
  let suffix = 2;

  for (;;) {
    const clash = await prisma.campaign.findFirst({
      where: {
        slug,
        ...(exclude ? { NOT: { id: exclude } } : {}),
      },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function findOperationRowBySlugLookup(rawFriendlyName: string) {
  const rawTrim = String(rawFriendlyName || "").trim();
  if (!rawTrim) return null;

  const normalized = normalizeFriendlyName(rawTrim);
  const candidates = normalized ? [normalized] : [];
  if (rawTrim !== normalized) candidates.push(rawTrim);

  for (const slug of candidates) {
    const row = await prisma.operation.findUnique({
      where: { slug },
      include: operationInclude,
    });
    if (row) return row;
  }

  return null;
}

function enrichOperation(
  op: LegacyOperation,
  campaignById: Map<string, LegacyCampaign> | null,
): LegacyOperation {
  const baseTerrain =
    op.terrainConditions && typeof op.terrainConditions === "object"
      ? op.terrainConditions
      : {};
  const terrainConditions = mergeTerrainConditions(baseTerrain);
  const optionalobjectives = Array.isArray(op.optionalobjectives) ? op.optionalobjectives : [];
  const date = formatIsoDateLongDisplay(op.loreDate) || String(op.date || "").trim() || "";
  const planet = op.planet || DEFAULT_OP_META.planet;
  const sector = op.sector || DEFAULT_OP_META.sector;
  const opposingforce = op.opposingforce || DEFAULT_OP_META.opposingforce;
  const postDate =
    normalizeIsoDateOrEmpty(op.postDate) || postDateFromPostedTime(op.postedTime) || "";
  const loreDate = normalizeIsoDateOrEmpty(op.loreDate);
  const attendees = Array.isArray(op.attendees)
    ? Array.from(new Set(op.attendees.map((id) => String(id || "").trim()).filter(Boolean)))
    : [];

  const campaignId = String(op.campaignId || "").trim();
  let campaign = null;
  if (campaignId && campaignById) {
    const match = campaignById.get(campaignId);
    if (match) {
      campaign = {
        id: match.id,
        title: String(match.title || "").trim() || "Campaign",
        slug: String(match.slug || "").trim(),
      };
    }
  }

  return {
    ...op,
    terrainConditions,
    optionalobjectives,
    date,
    postDate,
    loreDate,
    attendees,
    planet,
    sector,
    opposingforce,
    campaign,
  };
}

function fixedOperationTimeTable() {
  return TERRAIN_CONDITIONS.operationTimeTable.map((row) => ({ ...row }));
}

export async function getOpsDashboardBundle(): Promise<OpsDashboardBundle> {
  const [campaignRows, operationRows] = await Promise.all([
    prisma.campaign.findMany({
      include: campaignInclude,
      orderBy: campaignOrderBy,
    }),
    prisma.operation.findMany({ include: operationInclude }),
  ]);

  return {
    version: 2,
    campaigns: sortCampaignsByStartDate(campaignRows.map(dbCampaignToLegacy)),
    operations: sortOperationsByPostedTimeDesc(operationRows.map(dbOpToLegacy)),
  };
}

export async function getEnrichedOpByFriendlyName(friendlyName: string) {
  const row = await findOperationRowBySlugLookup(friendlyName);
  if (!row) return null;

  const op = dbOpToLegacy(row);
  const campaignId = String(op.campaignId || "").trim();
  if (!campaignId) return enrichOperation(op, null);

  const campRow = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: campaignInclude,
  });
  const map = campRow
    ? buildCampaignIdMap([dbCampaignToLegacy(campRow)])
    : null;

  return enrichOperation(op, map);
}

export async function getCampaignBySlug(raw: string): Promise<LegacyCampaign | null> {
  const key = normalizeFriendlyName(raw);
  const rawTrim = String(raw || "").trim();

  if (key) {
    const row = await prisma.campaign.findUnique({
      where: { slug: key },
      include: campaignInclude,
    });
    if (row) return dbCampaignToLegacy(row);
  }

  if (rawTrim && /^[a-z0-9]{20,30}$/.test(rawTrim)) {
    const row = await prisma.campaign.findUnique({
      where: { id: rawTrim },
      include: campaignInclude,
    });
    if (row) return dbCampaignToLegacy(row);
  }

  if (
    rawTrim &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawTrim)
  ) {
    const row = await prisma.campaign.findUnique({
      where: { id: rawTrim },
      include: campaignInclude,
    });
    if (row) return dbCampaignToLegacy(row);
  }

  return null;
}

export async function tryCreateOperation(payload: Record<string, unknown>) {
  const body = payload || {};
  const operationtitle = String(body.Operationtitle || "").trim();
  const opfreindlyname = String(body.opfreindlyname || "").trim();
  const postedTime = new Date().toISOString();
  const planet = String(body.planet || "").trim() || DEFAULT_OP_META.planet;
  const sector = String(body.sector || "").trim() || DEFAULT_OP_META.sector;
  const opposingforce =
    String(body.opposingforce || "").trim() || DEFAULT_OP_META.opposingforce;
  const environmentalElements =
    String(body.environmentalElements || "").trim() ||
    TERRAIN_CONDITIONS.environmentalElements;
  const timeOfDay = String(body.timeOfDay || "").trim() || TERRAIN_CONDITIONS.timeOfDay;
  const terrain = String(body.terrain || "").trim() || TERRAIN_CONDITIONS.terrain;
  const localsPresence =
    String(body.localsPresence || "").trim() || TERRAIN_CONDITIONS.localsPresence;
  const planopsLink =
    String(body.planopsLink || "").trim() || TERRAIN_CONDITIONS.planopsLink;
  const missionstatement = String(body.missionstatement || "").trim();
  const opdescription = String(body.opdescription || "").trim();
  const mainobjective = String(body.mainobjective || "").trim();
  const secondaryobjective = String(body.secondaryobjective || "").trim();
  const optionalobjectives = parseOptionalObjectivesFromBody(body);
  const operationTimeTable = fixedOperationTimeTable();

  if (
    !operationtitle ||
    !opfreindlyname ||
    !missionstatement ||
    !opdescription ||
    !mainobjective ||
    !secondaryobjective
  ) {
    return {
      ok: false as const,
      status: 400,
      message:
        "Missing required fields. Required: Operationtitle, opfreindlyname, missionstatement, opdescription, mainobjective, secondaryobjective.",
    };
  }

  const normalizedFriendly = normalizeFriendlyName(opfreindlyname);
  if (!normalizedFriendly) {
    return { ok: false as const, status: 400, message: "Invalid opfreindlyname." };
  }

  const existing = await prisma.operation.findUnique({
    where: { slug: normalizedFriendly },
  });
  if (existing) {
    return {
      ok: false as const,
      status: 409,
      message: `Operation with opfreindlyname '${normalizedFriendly}' already exists.`,
    };
  }

  const campaignIdRaw = String(body.campaignId || "").trim();
  if (campaignIdRaw) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignIdRaw } });
    if (!campaign) {
      return {
        ok: false as const,
        status: 400,
        message: "Invalid campaignId: campaign not found.",
      };
    }
  }

  let postDate = normalizeIsoDateOrEmpty(body.postDate);
  if (!postDate) postDate = postDateFromPostedTime(postedTime);
  const loreDate = normalizeIsoDateOrEmpty(body.loreDate);

  const terrainConditionsObj = {
    ...TERRAIN_CONDITIONS,
    environmentalElements,
    timeOfDay,
    terrain,
    localsPresence,
    planopsLink,
    operationTimeTable,
  };

  const row = await prisma.operation.create({
    data: {
      title: operationtitle,
      slug: normalizedFriendly,
      postDate,
      loreDate,
      planet,
      sector,
      opposingForce: opposingforce,
      postedTime: new Date(postedTime),
      missionStatement: missionstatement,
      description: opdescription,
      mainObjective: mainobjective,
      secondaryObjective: secondaryobjective,
      optionalObjectives: optionalobjectives,
      terrainConditions: terrainConditionsObj,
      campaignId: campaignIdRaw || null,
    },
    include: operationInclude,
  });

  return { ok: true as const, operation: dbOpToLegacy(row) };
}

export async function tryUpdateOperation(
  rawFriendlyName: string,
  payload: Record<string, unknown>,
) {
  const rawRouteSlug = String(rawFriendlyName || "").trim();
  if (!rawRouteSlug) {
    return { ok: false as const, status: 400, message: "Invalid operation identifier." };
  }

  const body = payload || {};
  const operationtitle = String(body.Operationtitle || "").trim();
  const opfreindlyname = String(body.opfreindlyname || "").trim();
  const planet = String(body.planet || "").trim() || DEFAULT_OP_META.planet;
  const sector = String(body.sector || "").trim() || DEFAULT_OP_META.sector;
  const opposingforce =
    String(body.opposingforce || "").trim() || DEFAULT_OP_META.opposingforce;
  const environmentalElements =
    String(body.environmentalElements || "").trim() ||
    TERRAIN_CONDITIONS.environmentalElements;
  const timeOfDay = String(body.timeOfDay || "").trim() || TERRAIN_CONDITIONS.timeOfDay;
  const terrain = String(body.terrain || "").trim() || TERRAIN_CONDITIONS.terrain;
  const localsPresence =
    String(body.localsPresence || "").trim() || TERRAIN_CONDITIONS.localsPresence;
  const planopsLink =
    String(body.planopsLink || "").trim() || TERRAIN_CONDITIONS.planopsLink;
  const missionstatement = String(body.missionstatement || "").trim();
  const opdescription = String(body.opdescription || "").trim();
  const mainobjective = String(body.mainobjective || "").trim();
  const secondaryobjective = String(body.secondaryobjective || "").trim();
  const optionalobjectives = parseOptionalObjectivesFromBody(body);
  const operationTimeTable = fixedOperationTimeTable();

  if (
    !operationtitle ||
    !opfreindlyname ||
    !missionstatement ||
    !opdescription ||
    !mainobjective ||
    !secondaryobjective
  ) {
    return {
      ok: false as const,
      status: 400,
      message:
        "Missing required fields. Required: Operationtitle, opfreindlyname, missionstatement, opdescription, mainobjective, secondaryobjective.",
    };
  }

  const normalizedFriendly = normalizeFriendlyName(opfreindlyname);
  if (!normalizedFriendly) {
    return { ok: false as const, status: 400, message: "Invalid opfreindlyname." };
  }

  const prev = await findOperationRowBySlugLookup(rawRouteSlug);
  if (!prev) {
    return { ok: false as const, status: 404, message: "Operation not found." };
  }

  const currentSlugNorm = normalizeFriendlyName(prev.slug);
  if (normalizedFriendly !== currentSlugNorm) {
    const clash = await prisma.operation.findUnique({
      where: { slug: normalizedFriendly },
    });
    if (clash) {
      return {
        ok: false as const,
        status: 409,
        message: `Operation with opfreindlyname '${normalizedFriendly}' already exists.`,
      };
    }
  }

  const postedTime = prev.postedTime
    ? prev.postedTime.toISOString()
    : new Date().toISOString();
  let postDate =
    normalizeIsoDateOrEmpty(prev.postDate) || postDateFromPostedTime(postedTime);
  if (Object.prototype.hasOwnProperty.call(body, "postDate")) {
    const incoming = normalizeIsoDateOrEmpty(body.postDate);
    postDate = incoming || postDateFromPostedTime(postedTime) || postDate;
  }

  let loreDate = normalizeIsoDateOrEmpty(prev.loreDate);
  if (Object.prototype.hasOwnProperty.call(body, "loreDate")) {
    loreDate = normalizeIsoDateOrEmpty(body.loreDate);
  }

  let legacyDate = prev.legacyDate || null;
  if (!loreDate && legacyDate) {
    // keep legacy date
  } else if (Object.prototype.hasOwnProperty.call(body, "date")) {
    legacyDate = String(body.date || "").trim() || null;
  }

  let campaignId = prev.campaignId || null;
  if (Object.prototype.hasOwnProperty.call(body, "campaignId")) {
    const rawCampaignId = String(body.campaignId || "").trim();
    if (!rawCampaignId) {
      campaignId = null;
    } else {
      const campaign = await prisma.campaign.findUnique({ where: { id: rawCampaignId } });
      if (!campaign) {
        return {
          ok: false as const,
          status: 400,
          message: "Invalid campaignId: campaign not found.",
        };
      }
      campaignId = rawCampaignId;
    }
  }

  const terrainConditionsObj = {
    ...TERRAIN_CONDITIONS,
    environmentalElements,
    timeOfDay,
    terrain,
    localsPresence,
    planopsLink,
    operationTimeTable,
  };

  const row = await prisma.operation.update({
    where: { slug: prev.slug },
    data: {
      title: operationtitle,
      slug: normalizedFriendly,
      postDate,
      loreDate,
      legacyDate,
      planet,
      sector,
      opposingForce: opposingforce,
      postedTime: new Date(postedTime),
      missionStatement: missionstatement,
      description: opdescription,
      mainObjective: mainobjective,
      secondaryObjective: secondaryobjective,
      optionalObjectives: optionalobjectives,
      terrainConditions: terrainConditionsObj,
      campaignId,
    },
    include: operationInclude,
  });

  return { ok: true as const, operation: dbOpToLegacy(row) };
}

export async function tryDeleteOperation(rawFriendlyName: string) {
  const rawTrim = String(rawFriendlyName || "").trim();
  if (!rawTrim) {
    return { ok: false as const, status: 400, message: "Invalid operation identifier." };
  }

  const row = await findOperationRowBySlugLookup(rawTrim);
  if (!row) {
    return { ok: false as const, status: 404, message: "Operation not found." };
  }

  await prisma.operation.delete({ where: { slug: row.slug } });
  return { ok: true as const };
}

export async function tryCreateCampaign(payload: Record<string, unknown>) {
  const body = payload || {};
  const norm = normalizeCampaignPayload(body);
  if (!norm) {
    return { ok: false as const, status: 400, message: "Invalid campaign payload." };
  }

  let slugBase = normalizeFriendlyName(String(body.slug || ""));
  if (!slugBase) slugBase = normalizeFriendlyName(String(body.title || "")) || "campaign";
  const slug = await allocateUniqueCampaignSlug(slugBase);

  const row = await prisma.campaign.create({
    data: {
      title: norm.title,
      slug,
      progress: norm.progress,
      startDate: norm.startDate,
      endDate: norm.endDate,
      loreDate: norm.loreDate,
      overview: norm.overview,
      hostileStrengthLevel: norm.hostileStrengthLevel,
      hostileAssets: norm.hostileAssets,
      sector: norm.sector,
      environmentalThreats: norm.environmentalThreats,
      additionalIntel: norm.additionalIntel,
      linkedAssets: {
        create: norm.linkedAssets.map((asset) => ({
          assetId: asset.assetId,
          status: asset.status,
        })),
      },
    },
    include: campaignInclude,
  });

  return { ok: true as const, campaign: dbCampaignToLegacy(row) };
}

export async function tryUpdateCampaign(rawId: string, payload: Record<string, unknown>) {
  const id = String(rawId || "").trim();
  if (!id) return { ok: false as const, status: 400, message: "Campaign id required." };

  const existing = await prisma.campaign.findUnique({
    where: { id },
    include: campaignInclude,
  });
  if (!existing) {
    return { ok: false as const, status: 404, message: "Campaign not found." };
  }

  const body = payload || {};
  const merged = { ...dbCampaignToLegacy(existing), ...body };
  const norm = normalizeCampaignPayload(merged);
  if (!norm) return { ok: false as const, status: 400, message: "Invalid campaign data." };

  let slugBase = normalizeFriendlyName(existing.slug || "");
  if (Object.prototype.hasOwnProperty.call(body, "slug")) {
    slugBase = normalizeFriendlyName(String(body.slug || ""));
  }
  if (!slugBase) slugBase = normalizeFriendlyName(merged.title || "") || "campaign";
  const slug = await allocateUniqueCampaignSlug(slugBase, id);

  await prisma.campaignAssetLink.deleteMany({ where: { campaignId: id } });

  const row = await prisma.campaign.update({
    where: { id },
    data: {
      title: norm.title,
      slug,
      progress: norm.progress,
      startDate: norm.startDate,
      endDate: norm.endDate,
      loreDate: norm.loreDate,
      overview: norm.overview,
      hostileStrengthLevel: norm.hostileStrengthLevel,
      hostileAssets: norm.hostileAssets,
      sector: norm.sector,
      environmentalThreats: norm.environmentalThreats,
      additionalIntel: norm.additionalIntel,
      linkedAssets: {
        create: norm.linkedAssets.map((asset) => ({
          assetId: asset.assetId,
          status: asset.status,
        })),
      },
    },
    include: campaignInclude,
  });

  return { ok: true as const, campaign: dbCampaignToLegacy(row) };
}

export async function tryDeleteCampaign(rawId: string) {
  const id = String(rawId || "").trim();
  if (!id) return { ok: false as const, status: 400, message: "Campaign id required." };

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false as const, status: 404, message: "Campaign not found." };
  }

  await prisma.operation.updateMany({
    where: { campaignId: id },
    data: { campaignId: null },
  });
  await prisma.campaign.delete({ where: { id } });

  return { ok: true as const };
}

export async function recordOperationAttendance(opSlug: string, attendeeIds: string[]) {
  const slug = normalizeFriendlyName(opSlug);
  if (!slug) return;

  const ids = Array.isArray(attendeeIds)
    ? attendeeIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return;

  const op = await prisma.operation.findUnique({ where: { slug } });
  if (!op) return;

  await Promise.all(
    ids.map((serviceRecordId) =>
      prisma.operationAttendee.upsert({
        where: {
          operationId_serviceRecordId: {
            operationId: op.id,
            serviceRecordId,
          },
        },
        update: {},
        create: {
          operationId: op.id,
          serviceRecordId,
        },
      }),
    ),
  );
}

export async function removeOperationAttendance(opSlug: string, attendeeIds: string[]) {
  const slug = normalizeFriendlyName(opSlug);
  if (!slug) return { ok: false as const, reason: "invalid_slug" };

  const ids = Array.isArray(attendeeIds)
    ? attendeeIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) return { ok: false as const, reason: "no_ids" };

  const op = await prisma.operation.findUnique({ where: { slug } });
  if (!op) return { ok: false as const, reason: "not_found" };

  const result = await prisma.operationAttendee.deleteMany({
    where: {
      operationId: op.id,
      serviceRecordId: { in: ids },
    },
  });

  return { ok: true as const, changed: result.count > 0 };
}

export async function setOperationAttendees(opSlug: string, attendeeIds: string[]) {
  const slug = normalizeFriendlyName(opSlug);
  if (!slug) {
    return { ok: false as const, status: 400, message: "Invalid operation slug." };
  }

  const ids = Array.isArray(attendeeIds)
    ? Array.from(new Set(attendeeIds.map((id) => String(id || "").trim()).filter(Boolean)))
    : [];

  const op = await prisma.operation.findUnique({
    where: { slug },
    include: operationInclude,
  });
  if (!op) {
    return { ok: false as const, status: 404, message: "Operation not found." };
  }

  const currentIds = new Set((op.attendees || []).map((attendee) => attendee.serviceRecordId));
  const nextIds = new Set(ids);
  const toAdd = ids.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

  if (toRemove.length) {
    await prisma.operationAttendee.deleteMany({
      where: {
        operationId: op.id,
        serviceRecordId: { in: toRemove },
      },
    });
  }

  if (toAdd.length) {
    await prisma.operationAttendee.createMany({
      data: toAdd.map((serviceRecordId) => ({
        operationId: op.id,
        serviceRecordId,
      })),
      skipDuplicates: true,
    });
  }

  const row = await prisma.operation.findUnique({
    where: { slug },
    include: operationInclude,
  });

  return {
    ok: true as const,
    operation: dbOpToLegacy(row!),
    added: toAdd.length,
    removed: toRemove.length,
  };
}

export async function getAttendeePickerData() {
  const [rows, orbatSettings] = await Promise.all([
    prisma.serviceRecord.findMany({
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        rank: true,
      },
    }),
    loadOrbatSettingsFromDb(),
  ]);

  const users = rows
    .map((row) => ({
      id: String(row.id || "").trim(),
      displayName: String(row.displayName || "").trim(),
      firstName: String(row.firstName || "").trim(),
      lastName: String(row.lastName || "").trim(),
      rank: String(row.rank || "").trim(),
    }))
    .filter((row) => row.id)
    .sort((a, b) => {
      const aName = `${a.firstName} ${a.lastName} ${a.displayName}`.trim().toLowerCase();
      const bName = `${b.firstName} ${b.lastName} ${b.displayName}`.trim().toLowerCase();
      return aName.localeCompare(bName, undefined, { sensitivity: "base" });
    });

  return { users, orbatSettings };
}
