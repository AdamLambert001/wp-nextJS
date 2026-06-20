import { emptyUnitLore, normalizeUnitLore } from "@/lib/lore/normalize";
import type { UnitLore } from "@/lib/lore/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = ["Ship", "External Unit", "External Support"];

export async function loadUnitLoreFromDb(): Promise<UnitLore> {
  const [config, categories, assets] = await Promise.all([
    prisma.loreConfig.findUnique({ where: { id: 1 } }),
    prisma.loreAssetCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.loreAsset.findMany({
      orderBy: { sortOrder: "asc" },
      include: { category: true },
    }),
  ]);

  if (!config && categories.length === 0 && assets.length === 0) {
    return emptyUnitLore();
  }

  const backgroundLore = String(config?.backgroundLore ?? "");
  const assetCategories =
    categories.length > 0
      ? categories.map((category) => category.label)
      : DEFAULT_CATEGORIES.slice();

  const mappedAssets = assets.map((asset) => ({
    id: asset.id,
    title: asset.title,
    category:
      asset.category?.label || assetCategories[0] || DEFAULT_CATEGORIES[0],
    description: asset.description || "",
    pictureUrl: asset.pictureUrl || "",
  }));

  return normalizeUnitLore({
    backgroundLore,
    assetCategories,
    assets: mappedAssets,
  });
}

export async function loadPublicUnitLoreData() {
  const lore = await loadUnitLoreFromDb();
  return { ok: true as const, lore };
}
