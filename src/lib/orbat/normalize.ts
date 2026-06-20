import type { OrbatSettings } from "@/lib/orbat/types";

export function normalizeSlug(input: unknown): string {
  const value = String(input ?? "")
    .trim()
    .toLowerCase();
  return /^[a-z0-9_]+$/.test(value) ? value : "";
}

export function slugifyInput(input: unknown): string {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeHexColor(input: unknown): string {
  const value = String(input ?? "")
    .trim()
    .toLowerCase();
  return /^#[0-9a-f]{6}$/.test(value) ? value : "";
}

function normalizeImageUrl(input: unknown): string {
  const value = String(input ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return "";
}

export function normalizeOrbatSettings(input: unknown): OrbatSettings {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const rawCategories = Array.isArray((src as OrbatSettings).categories)
    ? (src as OrbatSettings).categories
    : [];
  const categories: OrbatSettings["categories"] = [];
  const seenCategories = new Set<string>();

  for (const category of rawCategories) {
    if (!category || typeof category !== "object") continue;
    const title = String(category.title ?? "").trim();
    const id = normalizeSlug(category.id) || slugifyInput(category.id || title);
    if (!title || !id || seenCategories.has(id)) continue;
    seenCategories.add(id);

    const rawGroups = Array.isArray(category.groups) ? category.groups : [];
    const groups: OrbatSettings["categories"][number]["groups"] = [];
    const seenGroups = new Set<string>();

    for (const group of rawGroups) {
      if (!group || typeof group !== "object") continue;
      const groupTitle = String(group.title ?? "").trim();
      const groupId = normalizeSlug(group.id) || slugifyInput(group.id || groupTitle);
      if (!groupTitle || !groupId || seenGroups.has(groupId)) continue;
      seenGroups.add(groupId);

      const color = normalizeHexColor(group.color);
      const backgroundImage = normalizeImageUrl(group.backgroundImage);
      const trainingCategoryId =
        normalizeSlug(String(group.trainingCategoryId ?? "").trim()) ||
        slugifyInput(group.trainingCategoryId);
      const rawRows = Array.isArray(group.rows) ? group.rows : [];
      const rows: OrbatSettings["categories"][number]["groups"][number]["rows"] = [];
      const seenRows = new Set<string>();

      for (let rowIdx = 0; rowIdx < rawRows.length; rowIdx += 1) {
        const row = rawRows[rowIdx];
        if (!row || typeof row !== "object") continue;
        const position = String(row.position ?? "").trim();
        let rowId =
          normalizeSlug(row.id) ||
          slugifyInput(row.id || `${groupId}_${position}_${rowIdx + 1}`);
        if (!position || !rowId) continue;
        if (seenRows.has(rowId)) {
          rowId = slugifyInput(`${rowId}_${rowIdx + 1}`);
        }
        if (!rowId || seenRows.has(rowId)) continue;
        seenRows.add(rowId);
        rows.push({
          id: rowId,
          position,
          assignedUserId: String(row.assignedUserId ?? "").trim(),
          lastEditedAt: String(row.lastEditedAt ?? "").trim(),
        });
      }

      groups.push({
        id: groupId,
        title: groupTitle,
        color,
        backgroundImage,
        trainingCategoryId,
        rows,
      });
    }

    categories.push({ id, title, groups });
  }

  return { categories };
}

export function prepareOrbatForSave(settings: OrbatSettings): OrbatSettings {
  return normalizeOrbatSettings({
    categories: settings.categories.map((category, catIdx) => ({
      id: slugifyInput(category.id || category.title || `category_${catIdx + 1}`),
      title: String(category.title ?? "").trim() || `Category ${catIdx + 1}`,
      groups: category.groups.map((group, groupIdx) => ({
        id: slugifyInput(group.id || group.title || `group_${groupIdx + 1}`),
        title: String(group.title ?? "").trim() || `Group ${groupIdx + 1}`,
        color: /^#[0-9a-fA-F]{6}$/.test(String(group.color ?? "").trim())
          ? String(group.color ?? "").trim()
          : "",
        backgroundImage: normalizeImageUrl(group.backgroundImage),
        trainingCategoryId: slugifyInput(String(group.trainingCategoryId ?? "").trim()),
        rows: group.rows.map((row, rowIdx) => ({
          id: slugifyInput(row.id || row.position || `row_${rowIdx + 1}`),
          position: String(row.position ?? "").trim() || `Position ${rowIdx + 1}`,
          assignedUserId: String(row.assignedUserId ?? "").trim(),
          lastEditedAt: String(row.lastEditedAt ?? "").trim(),
        })),
      })),
    })),
  });
}

export function ensureOrbatSettings(value: unknown): OrbatSettings {
  const src = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const categories = Array.isArray((src as OrbatSettings).categories)
    ? (src as OrbatSettings).categories
    : [];

  return {
    categories: categories.map((cat) => ({
      id: String(cat.id ?? ""),
      title: String(cat.title ?? ""),
      groups: (Array.isArray(cat.groups) ? cat.groups : []).map((group) => ({
        id: String(group.id ?? ""),
        title: String(group.title ?? ""),
        color: String(group.color ?? ""),
        backgroundImage: String(group.backgroundImage ?? ""),
        trainingCategoryId: String(group.trainingCategoryId ?? ""),
        rows: (Array.isArray(group.rows) ? group.rows : []).map((row) => ({
          id: String(row.id ?? ""),
          position: String(row.position ?? ""),
          assignedUserId: String(row.assignedUserId ?? ""),
          lastEditedAt: String(row.lastEditedAt ?? ""),
        })),
      })),
    })),
  };
}
