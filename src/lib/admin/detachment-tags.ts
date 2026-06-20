import {
  normalizeDetachmentHexColor,
  normalizeDetachmentTitleKey,
  randomColorForDetachment,
  type DetachmentTagConfig,
  type DetachmentTagEntry,
  type DetachmentTagLookup,
} from "@/lib/admin/detachment-tags.shared";
import { normalizeLucideIconName } from "@/lib/lucide-icon-catalog";
import { prisma } from "@/lib/prisma";

export type {
  DetachmentTagConfig,
  DetachmentTagEntry,
  DetachmentTagLookup,
} from "@/lib/admin/detachment-tags.shared";

async function loadOrbatDetachments(): Promise<Array<{ title: string; categoryTitle: string }>> {
  const categories = await prisma.orbatCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      groups: {
        orderBy: { sortOrder: "asc" },
        select: { title: true },
      },
    },
  });

  const seen = new Set<string>();
  const detachments: Array<{ title: string; categoryTitle: string }> = [];

  for (const category of categories) {
    for (const group of category.groups) {
      const title = String(group.title ?? "").trim();
      if (!title) continue;

      const key = normalizeDetachmentTitleKey(title);
      if (seen.has(key)) continue;
      seen.add(key);

      detachments.push({
        title,
        categoryTitle: String(category.title ?? "").trim() || "Uncategorized",
      });
    }
  }

  return detachments;
}

export async function loadDetachmentTagEntries(): Promise<DetachmentTagEntry[]> {
  const [detachments, savedTags] = await Promise.all([
    loadOrbatDetachments(),
    prisma.detachmentTag.findMany({ orderBy: { title: "asc" } }),
  ]);

  const savedByKey = new Map(
    savedTags.map((tag) => [normalizeDetachmentTitleKey(tag.title), tag]),
  );

  return detachments.map((detachment) => {
    const saved = savedByKey.get(normalizeDetachmentTitleKey(detachment.title));
    const savedColor = normalizeDetachmentHexColor(saved?.color);
    const savedIcon = normalizeLucideIconName(saved?.icon);

    return {
      title: detachment.title,
      categoryTitle: detachment.categoryTitle,
      color: savedColor || randomColorForDetachment(detachment.title),
      icon: savedIcon,
      isPersisted: Boolean(saved),
    };
  });
}

export async function saveDetachmentTags(tags: DetachmentTagConfig[]): Promise<DetachmentTagEntry[]> {
  const orbatDetachments = await loadOrbatDetachments();
  const allowedKeys = new Set(
    orbatDetachments.map((entry) => normalizeDetachmentTitleKey(entry.title)),
  );

  await prisma.$transaction(async (tx) => {
    for (const tag of tags) {
      const title = String(tag.title ?? "").trim();
      if (!title || !allowedKeys.has(normalizeDetachmentTitleKey(title))) continue;

      const color = normalizeDetachmentHexColor(tag.color) || randomColorForDetachment(title);
      const icon = normalizeLucideIconName(tag.icon);

      await tx.detachmentTag.upsert({
        where: { title },
        create: { title, color, icon },
        update: { color, icon },
      });
    }

    const savedTitles = tags
      .map((tag) => String(tag.title ?? "").trim())
      .filter((title) => title && allowedKeys.has(normalizeDetachmentTitleKey(title)));

    if (savedTitles.length) {
      await tx.detachmentTag.deleteMany({
        where: {
          title: { notIn: savedTitles },
        },
      });
    } else {
      await tx.detachmentTag.deleteMany();
    }
  });

  return loadDetachmentTagEntries();
}

export async function loadDetachmentTagLookup(): Promise<DetachmentTagLookup> {
  const entries = await loadDetachmentTagEntries();
  const lookup: DetachmentTagLookup = {};

  for (const entry of entries) {
    lookup[normalizeDetachmentTitleKey(entry.title)] = {
      title: entry.title,
      color: entry.color,
      icon: entry.icon,
    };
  }

  return lookup;
}
