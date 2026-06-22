import { applyOrbatAssignments } from "@/lib/orbat/save";
import { prisma } from "@/lib/prisma";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";
import { normalizeSrSettings } from "@/lib/sr-settings/normalize";
import type { SrSettings } from "@/lib/sr-settings/types";
import type { Prisma } from "@/generated/prisma/client";

export type SrSettingsSaveScope =
  | "training"
  | "ranks"
  | "medals"
  | "campaignRibbons"
  | "orbat"
  | "radios"
  | "adminDepartments";

const TRANSACTION_TIMEOUT_MS = 60_000;

const ALL_SCOPES: SrSettingsSaveScope[] = [
  "training",
  "ranks",
  "medals",
  "campaignRibbons",
  "orbat",
  "radios",
  "adminDepartments",
];

type TransactionClient = Prisma.TransactionClient;

function shouldSaveScope(
  scope: SrSettingsSaveScope,
  scopes: SrSettingsSaveScope[] | undefined,
): boolean {
  return !scopes || scopes.length === 0 || scopes.includes(scope);
}

async function saveTrainingCategories(
  tx: TransactionClient,
  normalized: SrSettings,
): Promise<void> {
  await tx.trainingItem.deleteMany();
  await tx.trainingCategory.deleteMany();

  for (let i = 0; i < normalized.trainingCategories.length; i += 1) {
    const category = normalized.trainingCategories[i];
    await tx.trainingCategory.create({
      data: {
        localId: category.id,
        title: category.title,
        sortOrder: i,
        items: {
          createMany: {
            data: category.items.map((item, j) => ({
              slug: item.slug,
              label: item.label,
              sortOrder: j,
            })),
          },
        },
      },
    });
  }
}

async function saveRankCategories(tx: TransactionClient, normalized: SrSettings): Promise<void> {
  await tx.rank.deleteMany();
  await tx.rankCategory.deleteMany();

  for (let i = 0; i < normalized.rankCategories.length; i += 1) {
    const category = normalized.rankCategories[i];
    await tx.rankCategory.create({
      data: {
        localId: category.id,
        title: category.title,
        sortOrder: i,
        items: {
          createMany: {
            data: category.items.map((item, j) => ({
              slug: item.slug,
              label: item.label,
              abbr: item.abbr || "",
              cooldown: item.cooldown || 0,
              description: item.description || "",
              iconUrl: item.iconUrl || "",
              sortOrder: j,
            })),
          },
        },
      },
    });
  }
}

async function saveMedals(tx: TransactionClient, normalized: SrSettings): Promise<void> {
  await tx.medal.deleteMany();
  if (!normalized.medals.length) return;

  await tx.medal.createMany({
    data: normalized.medals.map((medal, i) => ({
      slug: medal.slug,
      displayName: medal.displayName,
      pictureUrl: medal.pictureUrl || "",
      description: medal.description || "",
      sortOrder: i,
    })),
  });
}

async function saveCampaignRibbons(
  tx: TransactionClient,
  normalized: SrSettings,
): Promise<void> {
  await tx.campaignRibbon.deleteMany();
  if (!normalized.campaignRibbons.length) return;

  await tx.campaignRibbon.createMany({
    data: normalized.campaignRibbons.map((ribbon, i) => ({
      slug: ribbon.slug,
      displayName: ribbon.displayName,
      pictureUrl: ribbon.pictureUrl || "",
      description: ribbon.description || "",
      sortOrder: i,
    })),
  });
}

async function saveRadioChannels(tx: TransactionClient, normalized: SrSettings): Promise<void> {
  await tx.radioChannel.deleteMany();
  await tx.radioChannelConfig.deleteMany();

  const radioChannels = normalized.radioChannels;
  await tx.radioChannelConfig.create({
    data: {
      id: 1,
      shortRangeHeader: radioChannels.shortRangeHeader,
      longRangeHeader: radioChannels.longRangeHeader,
      longRangeFrequencyLabel: radioChannels.longRangeFrequencyLabel,
    },
  });

  if (!radioChannels.columns.length) return;

  await tx.radioChannel.createMany({
    data: radioChannels.columns.map((column, i) => ({
      localId: column.id,
      title: column.title,
      squadRadioNet: column.squadRadioNet || "",
      fireteamRadioNetRed: column.fireteamRadioNetRed || "",
      fireteamRadioNetBlue: column.fireteamRadioNetBlue || "",
      longRangeRole: column.longRangeRole || "",
      longRangeFrequency: column.longRangeFrequency || "",
      sortOrder: i,
    })),
  });
}

async function saveOrbatSettings(tx: TransactionClient, normalized: SrSettings): Promise<void> {
  await tx.orbatPosition.deleteMany();
  await tx.orbatGroup.deleteMany();
  await tx.orbatCategory.deleteMany();

  for (let i = 0; i < normalized.orbatSettings.categories.length; i += 1) {
    const category = normalized.orbatSettings.categories[i];
    await tx.orbatCategory.create({
      data: {
        localId: category.id,
        title: category.title,
        sortOrder: i,
        groups: {
          create: category.groups.map((group, j) => ({
            localId: group.id,
            title: group.title,
            color: group.color || "",
            backgroundImage: group.backgroundImage || "",
            trainingCategoryId: group.trainingCategoryId || "",
            sortOrder: j,
            positions: {
              createMany: {
                data: group.rows.map((row, k) => ({
                  localId: row.id,
                  position: row.position,
                  assignedUserId: row.assignedUserId || "",
                  lastEditedAt: row.lastEditedAt || "",
                  sortOrder: k,
                })),
              },
            },
          })),
        },
      },
    });
  }
}

async function saveAdminDepartments(tx: TransactionClient, normalized: SrSettings): Promise<void> {
  await tx.adminPosition.deleteMany();
  await tx.adminSubcategory.deleteMany();
  await tx.adminDepartment.deleteMany();

  for (let i = 0; i < normalized.adminDepartments.length; i += 1) {
    const department = normalized.adminDepartments[i];
    await tx.adminDepartment.create({
      data: {
        localId: department.id,
        title: department.title,
        sortOrder: i,
        subcategories: {
          create: department.subcategories.map((subcategory, j) => ({
            localId: subcategory.id,
            title: subcategory.title,
            sortOrder: j,
            positions: {
              createMany: {
                data: subcategory.positions.map((position, k) => ({
                  localId: position.id,
                  name: position.name,
                  assignedUserId: position.assignedUserId || "",
                  status: position.status || "open",
                  sortOrder: k,
                })),
              },
            },
          })),
        },
      },
    });
  }
}

export function parseSrSettingsSaveScopes(value: unknown): SrSettingsSaveScope[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("_scopes must be an array");
  }

  const scopes: SrSettingsSaveScope[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || !ALL_SCOPES.includes(entry as SrSettingsSaveScope)) {
      throw new Error(`Invalid save scope: ${String(entry)}`);
    }
    if (!scopes.includes(entry as SrSettingsSaveScope)) {
      scopes.push(entry as SrSettingsSaveScope);
    }
  }

  return scopes.length > 0 ? scopes : undefined;
}

export async function saveSrSettings(
  nextRaw: unknown,
  options?: { scopes?: SrSettingsSaveScope[] },
): Promise<SrSettings> {
  const normalized = normalizeSrSettings(nextRaw);
  const scopes = options?.scopes;

  await prisma.$transaction(
    async (tx) => {
      if (shouldSaveScope("training", scopes)) {
        await saveTrainingCategories(tx, normalized);
      }
      if (shouldSaveScope("ranks", scopes)) {
        await saveRankCategories(tx, normalized);
      }
      if (shouldSaveScope("medals", scopes)) {
        await saveMedals(tx, normalized);
      }
      if (shouldSaveScope("campaignRibbons", scopes)) {
        await saveCampaignRibbons(tx, normalized);
      }
      if (shouldSaveScope("radios", scopes)) {
        await saveRadioChannels(tx, normalized);
      }
      if (shouldSaveScope("orbat", scopes)) {
        await saveOrbatSettings(tx, normalized);
      }
      if (shouldSaveScope("adminDepartments", scopes)) {
        await saveAdminDepartments(tx, normalized);
      }
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );

  if (scopes && scopes.length > 0) {
    return loadSrSettingsFromDb();
  }

  return normalized;
}

export async function saveSrSettingsWithOrbatAssignments(
  nextRaw: unknown,
  options?: { applyAssignments?: boolean; scopes?: SrSettingsSaveScope[] },
) {
  const saved = await saveSrSettings(nextRaw, { scopes: options?.scopes });
  if (options?.applyAssignments) {
    await applyOrbatAssignments(saved.orbatSettings);
  }
  return saved;
}
