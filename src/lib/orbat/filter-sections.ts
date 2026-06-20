import type { OrbatSettings } from "@/lib/orbat/types";

export type OrbatFilterSection = {
  key: string;
  label: string;
  memberIds: Set<string>;
};

export function buildOrbatFilterSections(
  orbatSettings: OrbatSettings | null | undefined,
): OrbatFilterSection[] {
  const sections: OrbatFilterSection[] = [];

  for (const [catIndex, category] of (orbatSettings?.categories ?? []).entries()) {
    for (const [groupIndex, group] of (category.groups ?? []).entries()) {
      const memberIds = new Set<string>();

      for (const row of group.rows ?? []) {
        const userId = String(row.assignedUserId ?? "").trim();
        if (userId && userId !== "__orbat_open__") {
          memberIds.add(userId);
        }
      }

      if (!memberIds.size) continue;

      const label =
        category.title && group.title
          ? `${category.title} / ${group.title}`
          : group.title || category.title || `Section ${catIndex + 1}-${groupIndex + 1}`;

      sections.push({
        key: `${category.id}|${group.id}|${catIndex}|${groupIndex}`,
        label,
        memberIds,
      });
    }
  }

  return sections.sort((a, b) => a.label.localeCompare(b.label));
}
