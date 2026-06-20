import { applyOrbatAssignments } from "@/lib/orbat/save";
import { prisma } from "@/lib/prisma";
import { normalizeSrSettings } from "@/lib/sr-settings/normalize";
import type { SrSettings } from "@/lib/sr-settings/types";

export async function saveSrSettings(nextRaw: unknown): Promise<SrSettings> {
  const normalized = normalizeSrSettings(nextRaw);

  await prisma.$transaction(
    async (tx) => {
      await tx.trainingItem.deleteMany();
      await tx.trainingCategory.deleteMany();
      await tx.rank.deleteMany();
      await tx.rankCategory.deleteMany();
      await tx.medal.deleteMany();
      await tx.campaignRibbon.deleteMany();
      await tx.orbatPosition.deleteMany();
      await tx.orbatGroup.deleteMany();
      await tx.orbatCategory.deleteMany();
      await tx.radioChannel.deleteMany();
      await tx.radioChannelConfig.deleteMany();
      await tx.adminPosition.deleteMany();
      await tx.adminSubcategory.deleteMany();
      await tx.adminDepartment.deleteMany();

      for (let i = 0; i < normalized.trainingCategories.length; i += 1) {
        const category = normalized.trainingCategories[i];
        const categoryRow = await tx.trainingCategory.create({
          data: { localId: category.id, title: category.title, sortOrder: i },
        });
        for (let j = 0; j < category.items.length; j += 1) {
          await tx.trainingItem.create({
            data: {
              categoryId: categoryRow.id,
              slug: category.items[j].slug,
              label: category.items[j].label,
              sortOrder: j,
            },
          });
        }
      }

      for (let i = 0; i < normalized.rankCategories.length; i += 1) {
        const category = normalized.rankCategories[i];
        const categoryRow = await tx.rankCategory.create({
          data: { localId: category.id, title: category.title, sortOrder: i },
        });
        for (let j = 0; j < category.items.length; j += 1) {
          const item = category.items[j];
          await tx.rank.create({
            data: {
              categoryId: categoryRow.id,
              slug: item.slug,
              label: item.label,
              abbr: item.abbr || "",
              cooldown: item.cooldown || 0,
              description: item.description || "",
              iconUrl: item.iconUrl || "",
              sortOrder: j,
            },
          });
        }
      }

      for (let i = 0; i < normalized.medals.length; i += 1) {
        const medal = normalized.medals[i];
        await tx.medal.create({
          data: {
            slug: medal.slug,
            displayName: medal.displayName,
            pictureUrl: medal.pictureUrl || "",
            description: medal.description || "",
            sortOrder: i,
          },
        });
      }

      for (let i = 0; i < normalized.campaignRibbons.length; i += 1) {
        const ribbon = normalized.campaignRibbons[i];
        await tx.campaignRibbon.create({
          data: {
            slug: ribbon.slug,
            displayName: ribbon.displayName,
            pictureUrl: ribbon.pictureUrl || "",
            description: ribbon.description || "",
            sortOrder: i,
          },
        });
      }

      const radioChannels = normalized.radioChannels;
      await tx.radioChannelConfig.create({
        data: {
          id: 1,
          shortRangeHeader: radioChannels.shortRangeHeader,
          longRangeHeader: radioChannels.longRangeHeader,
          longRangeFrequencyLabel: radioChannels.longRangeFrequencyLabel,
        },
      });
      for (let i = 0; i < radioChannels.columns.length; i += 1) {
        const column = radioChannels.columns[i];
        await tx.radioChannel.create({
          data: {
            localId: column.id,
            title: column.title,
            squadRadioNet: column.squadRadioNet || "",
            fireteamRadioNetRed: column.fireteamRadioNetRed || "",
            fireteamRadioNetBlue: column.fireteamRadioNetBlue || "",
            longRangeRole: column.longRangeRole || "",
            longRangeFrequency: column.longRangeFrequency || "",
            sortOrder: i,
          },
        });
      }

      for (let i = 0; i < normalized.orbatSettings.categories.length; i += 1) {
        const category = normalized.orbatSettings.categories[i];
        const categoryRow = await tx.orbatCategory.create({
          data: { localId: category.id, title: category.title, sortOrder: i },
        });
        for (let j = 0; j < category.groups.length; j += 1) {
          const group = category.groups[j];
          const groupRow = await tx.orbatGroup.create({
            data: {
              categoryId: categoryRow.id,
              localId: group.id,
              title: group.title,
              color: group.color || "",
              trainingCategoryId: group.trainingCategoryId || "",
              sortOrder: j,
            },
          });
          for (let k = 0; k < group.rows.length; k += 1) {
            const row = group.rows[k];
            await tx.orbatPosition.create({
              data: {
                groupId: groupRow.id,
                localId: row.id,
                position: row.position,
                assignedUserId: row.assignedUserId || "",
                lastEditedAt: row.lastEditedAt || "",
                sortOrder: k,
              },
            });
          }
        }
      }

      for (let i = 0; i < normalized.adminDepartments.length; i += 1) {
        const department = normalized.adminDepartments[i];
        const departmentRow = await tx.adminDepartment.create({
          data: { localId: department.id, title: department.title, sortOrder: i },
        });
        for (let j = 0; j < department.subcategories.length; j += 1) {
          const subcategory = department.subcategories[j];
          const subcategoryRow = await tx.adminSubcategory.create({
            data: {
              departmentId: departmentRow.id,
              localId: subcategory.id,
              title: subcategory.title,
              sortOrder: j,
            },
          });
          for (let k = 0; k < subcategory.positions.length; k += 1) {
            const position = subcategory.positions[k];
            await tx.adminPosition.create({
              data: {
                subcategoryId: subcategoryRow.id,
                localId: position.id,
                name: position.name,
                assignedUserId: position.assignedUserId || "",
                status: position.status || "open",
                sortOrder: k,
              },
            });
          }
        }
      }
    },
    { timeout: 15000 },
  );

  return normalized;
}

export async function saveSrSettingsWithOrbatAssignments(
  nextRaw: unknown,
  options?: { applyAssignments?: boolean },
) {
  const saved = await saveSrSettings(nextRaw);
  if (options?.applyAssignments) {
    await applyOrbatAssignments(saved.orbatSettings);
  }
  return saved;
}
