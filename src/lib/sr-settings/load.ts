import { loadOrbatSettingsFromDb } from "@/lib/orbat/load";
import { prisma } from "@/lib/prisma";
import { normalizeSrSettings } from "@/lib/sr-settings/normalize";
import type { SrSettings } from "@/lib/sr-settings/types";

type TrainingCategoryRow = Awaited<
  ReturnType<
    typeof prisma.trainingCategory.findMany<{
      include: { items: true };
    }>
  >
>[number];

type RankCategoryRow = Awaited<
  ReturnType<
    typeof prisma.rankCategory.findMany<{
      include: { items: true };
    }>
  >
>[number];

type AdminDepartmentRow = Awaited<
  ReturnType<
    typeof prisma.adminDepartment.findMany<{
      include: {
        subcategories: {
          include: { positions: true };
        };
      };
    }>
  >
>[number];

function buildCacheFromDbRows(input: {
  trainingCategories: TrainingCategoryRow[];
  rankCategories: RankCategoryRow[];
  medals: Awaited<ReturnType<typeof prisma.medal.findMany>>;
  campaignRibbons: Awaited<ReturnType<typeof prisma.campaignRibbon.findMany>>;
  radioConfig: Awaited<ReturnType<typeof prisma.radioChannelConfig.findUnique>>;
  radioChannels: Awaited<ReturnType<typeof prisma.radioChannel.findMany>>;
  orbatSettings: Awaited<ReturnType<typeof loadOrbatSettingsFromDb>>;
  adminDepartments: AdminDepartmentRow[];
}): SrSettings {
  return normalizeSrSettings({
    trainingCategories: input.trainingCategories.map((category) => ({
      id: category.localId,
      title: category.title,
      items: category.items.map((item) => ({
        slug: item.slug,
        label: item.label,
      })),
    })),
    rankCategories: input.rankCategories.map((category) => ({
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
    medals: input.medals.map((medal) => ({
      slug: medal.slug,
      displayName: medal.displayName,
      pictureUrl: medal.pictureUrl,
      description: medal.description,
    })),
    campaignRibbons: input.campaignRibbons.map((ribbon) => ({
      slug: ribbon.slug,
      displayName: ribbon.displayName,
      pictureUrl: ribbon.pictureUrl,
      description: ribbon.description,
    })),
    orbatSettings: input.orbatSettings,
    radioChannels: {
      shortRangeHeader: input.radioConfig?.shortRangeHeader ?? "Short Range Radio (SR)",
      longRangeHeader: input.radioConfig?.longRangeHeader ?? "Long Range Radio (SR)",
      longRangeFrequencyLabel:
        input.radioConfig?.longRangeFrequencyLabel ?? "LR Frequency",
      columns: input.radioChannels.map((channel) => ({
        id: channel.localId,
        title: channel.title,
        squadRadioNet: channel.squadRadioNet,
        fireteamRadioNetRed: channel.fireteamRadioNetRed,
        fireteamRadioNetBlue: channel.fireteamRadioNetBlue,
        longRangeRole: channel.longRangeRole,
        longRangeFrequency: channel.longRangeFrequency,
      })),
    },
    adminDepartments: input.adminDepartments.map((department) => ({
      id: department.localId,
      title: department.title,
      subcategories: department.subcategories.map((subcategory) => ({
        id: subcategory.localId,
        title: subcategory.title,
        positions: subcategory.positions.map((position) => ({
          id: position.localId,
          name: position.name,
          assignedUserId: position.assignedUserId,
          status: position.status === "closed" ? "closed" : "open",
        })),
      })),
    })),
  });
}

export async function loadSrSettingsFromDb(): Promise<SrSettings> {
  const [
    trainingCategories,
    rankCategories,
    medals,
    campaignRibbons,
    radioConfig,
    radioChannels,
    orbatSettings,
    adminDepartments,
  ] = await Promise.all([
    prisma.trainingCategory.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.rankCategory.findMany({
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.medal.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.campaignRibbon.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.radioChannelConfig.findUnique({ where: { id: 1 } }),
    prisma.radioChannel.findMany({ orderBy: { sortOrder: "asc" } }),
    loadOrbatSettingsFromDb(),
    prisma.adminDepartment.findMany({
      include: {
        subcategories: {
          orderBy: { sortOrder: "asc" },
          include: { positions: { orderBy: { sortOrder: "asc" } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const hasData =
    trainingCategories.length > 0 ||
    rankCategories.length > 0 ||
    medals.length > 0 ||
    campaignRibbons.length > 0 ||
    orbatSettings.categories.length > 0 ||
    radioChannels.length > 0 ||
    adminDepartments.length > 0;

  if (!hasData) {
    return normalizeSrSettings({});
  }

  return buildCacheFromDbRows({
    trainingCategories,
    rankCategories,
    medals,
    campaignRibbons,
    radioConfig,
    radioChannels,
    orbatSettings,
    adminDepartments,
  });
}

export async function loadPublicRanksData() {
  const settings = await loadSrSettingsFromDb();
  return {
    ok: true as const,
    rankCategories: settings.rankCategories,
  };
}

export async function loadPublicRadiosData() {
  const settings = await loadSrSettingsFromDb();
  return {
    ok: true as const,
    radioChannels: settings.radioChannels,
  };
}

function collectAdminDepartmentAssignedUserIds(
  adminDepartments: SrSettings["adminDepartments"],
): string[] {
  const userIds = new Set<string>();
  for (const department of adminDepartments) {
    for (const subcategory of department.subcategories) {
      for (const position of subcategory.positions) {
        const id = String(position.assignedUserId ?? "").trim();
        if (id) userIds.add(id);
      }
    }
  }
  return [...userIds];
}

export async function loadPublicAdminDepartmentsData() {
  const settings = await loadSrSettingsFromDb();
  const userIds = collectAdminDepartmentAssignedUserIds(settings.adminDepartments);

  const usersById: Record<
    string,
    { id: string; displayName: string; firstName: string; lastName: string; rank: string }
  > = {};

  if (userIds.length) {
    const rows = await prisma.serviceRecord.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        rank: true,
      },
    });

    for (const row of rows) {
      const id = String(row.id ?? "").trim();
      if (!id || !userIds.includes(id)) continue;
      usersById[id] = {
        id,
        displayName: String(row.displayName ?? "").trim(),
        firstName: String(row.firstName ?? "").trim(),
        lastName: String(row.lastName ?? "").trim(),
        rank: String(row.rank ?? "").trim(),
      };
    }
  }

  return {
    ok: true as const,
    adminDepartments: settings.adminDepartments,
    usersById,
  };
}
