import { normalizeUnitLore } from "@/lib/lore/normalize";
import type { UnitLore } from "@/lib/lore/types";
import { prisma } from "@/lib/prisma";

export async function saveUnitLore(nextRaw: unknown): Promise<UnitLore> {
  const normalized = normalizeUnitLore(nextRaw);

  await prisma.$transaction(
    async (tx) => {
      await tx.loreConfig.upsert({
        where: { id: 1 },
        update: { backgroundLore: normalized.backgroundLore },
        create: { id: 1, backgroundLore: normalized.backgroundLore },
      });

      await tx.loreAsset.deleteMany();
      await tx.loreAssetCategory.deleteMany();

      const categoryMap = new Map<string, string>();
      for (let i = 0; i < normalized.assetCategories.length; i += 1) {
        const label = normalized.assetCategories[i];
        const created = await tx.loreAssetCategory.create({
          data: { label, sortOrder: i },
        });
        categoryMap.set(label, created.id);
      }

      for (let i = 0; i < normalized.assets.length; i += 1) {
        const asset = normalized.assets[i];
        const categoryId = categoryMap.get(asset.category);
        if (!categoryId) continue;
        await tx.loreAsset.create({
          data: {
            id: asset.id,
            title: asset.title,
            description: asset.description,
            pictureUrl: asset.pictureUrl,
            sortOrder: i,
            categoryId,
          },
        });
      }
    },
    { timeout: 15000 },
  );

  return normalized;
}
