import type { AdminSelectOption } from "@/components/admin/admin-select-utils";
import type { OrbatSettings } from "@/lib/orbat/types";
import type { RankCategoryDefinition } from "@/lib/profile/types";

export const SERVICE_RECORD_EMPTY_SELECT_VALUE = "__none__";

export function buildRankSelectOptions(
  rankCategories: RankCategoryDefinition[],
): AdminSelectOption[] {
  const options: AdminSelectOption[] = [];
  const seen = new Set<string>();

  for (const category of rankCategories) {
    for (const item of category.items ?? []) {
      const label = String(item.label ?? "").trim();
      if (!label) continue;

      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      options.push({ value: label, label });
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function buildDetachmentSelectOptions(
  orbatSettings: OrbatSettings | null | undefined,
): AdminSelectOption[] {
  const options: AdminSelectOption[] = [];
  const seen = new Set<string>();

  for (const category of orbatSettings?.categories ?? []) {
    const categoryTitle = String(category.title ?? "").trim();

    for (const group of category.groups ?? []) {
      const title = String(group.title ?? "").trim();
      if (!title) continue;

      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const label =
        categoryTitle && categoryTitle.toLowerCase() !== title.toLowerCase()
          ? `${categoryTitle} / ${title}`
          : title;

      options.push({ value: title, label });
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function withCurrentSelectOption(
  options: AdminSelectOption[],
  current: string | null | undefined,
): AdminSelectOption[] {
  const trimmed = String(current ?? "").trim();
  if (!trimmed || options.some((option) => option.value === trimmed)) {
    return options;
  }

  return [{ value: trimmed, label: trimmed }, ...options];
}

export function toSelectValue(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || SERVICE_RECORD_EMPTY_SELECT_VALUE;
}

export function fromSelectValue(value: string): string | null {
  if (!value || value === SERVICE_RECORD_EMPTY_SELECT_VALUE) {
    return null;
  }
  return value;
}

export function buildOptionalSelectOptions(
  options: AdminSelectOption[],
  current: string | null | undefined,
): AdminSelectOption[] {
  return [
    { value: SERVICE_RECORD_EMPTY_SELECT_VALUE, label: "—" },
    ...withCurrentSelectOption(options, current),
  ];
}
