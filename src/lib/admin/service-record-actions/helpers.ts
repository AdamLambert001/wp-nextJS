import type { ProfileLogCategory } from "@/generated/prisma/client";
import { resolveActorLabel } from "@/lib/profile/log-notes";
import type { AccessContext } from "@/lib/rbac/types";
import { prisma } from "@/lib/prisma";
import type { SrSettings } from "@/lib/sr-settings/types";

export function actorFromAccess(access: AccessContext): string {
  return resolveActorLabel({
    name: access.name,
    discordId: access.discordId,
    discordName: access.discordRole?.discordName ?? null,
  });
}

export async function createProfileActivityLog(input: {
  serviceRecordId: string;
  category: ProfileLogCategory;
  occurredAt: Date;
  note: string;
}) {
  await prisma.profileActivityLog.create({
    data: {
      serviceRecordId: input.serviceRecordId,
      category: input.category,
      occurredAt: input.occurredAt,
      note: input.note,
    },
  });
}

export function trainingLabelFromSlug(settings: SrSettings, slug: string): string {
  const needle = String(slug ?? "").trim().toLowerCase();
  for (const category of settings.trainingCategories) {
    for (const item of category.items) {
      if (String(item.slug ?? "").trim().toLowerCase() === needle) {
        return String(item.label ?? "").trim() || needle;
      }
    }
  }
  return needle;
}

export function medalDisplayNameFromSlug(settings: SrSettings, slug: string): string {
  const needle = String(slug ?? "").trim().toLowerCase();
  const medal = settings.medals.find(
    (entry) => String(entry.slug ?? "").trim().toLowerCase() === needle,
  );
  return medal ? String(medal.displayName ?? "").trim() || needle : needle;
}

export function ribbonDisplayNameFromSlug(settings: SrSettings, slug: string): string {
  const needle = String(slug ?? "").trim().toLowerCase();
  const ribbon = settings.campaignRibbons.find(
    (entry) => String(entry.slug ?? "").trim().toLowerCase() === needle,
  );
  return ribbon ? String(ribbon.displayName ?? "").trim() || needle : needle;
}
