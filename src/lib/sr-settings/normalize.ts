import { normalizeOrbatSettings } from "@/lib/orbat/normalize";
import { normalizeSlug, slugifyInput } from "@/lib/sr-settings/slug";
import type {
  AdminDepartment,
  AdminDepartmentPosition,
  AdminDepartmentSubcategory,
  CampaignRibbonSettings,
  MedalSettings,
  RadioChannelColumn,
  RadioChannelsSettings,
  SrSettings,
  TrainingCategory,
} from "@/lib/sr-settings/types";
import type { RankCategoryDefinition } from "@/lib/profile/types";

function normalizeCategoryItems(
  input: unknown,
  includeRankMeta: boolean,
): TrainingCategory[] | RankCategoryDefinition[] {
  if (!Array.isArray(input)) return [];
  const out: Array<TrainingCategory | RankCategoryDefinition> = [];
  const seenCategoryIds = new Set<string>();

  for (const category of input) {
    if (!category || typeof category !== "object") continue;
    const id = normalizeSlug((category as { id?: unknown }).id);
    if (!id || seenCategoryIds.has(id)) continue;
    const title = String((category as { title?: unknown }).title ?? "").trim();
    if (!title) continue;
    seenCategoryIds.add(id);

    const seenItemIds = new Set<string>();
    const items: Array<
      | TrainingCategory["items"][number]
      | RankCategoryDefinition["items"][number]
    > = [];
    const rawItems = Array.isArray((category as { items?: unknown }).items)
      ? (category as { items: unknown[] }).items
      : [];

    for (const item of rawItems) {
      if (!item || typeof item !== "object") continue;
      const slug = normalizeSlug((item as { slug?: unknown }).slug);
      if (!slug) continue;
      let key = slug;
      if (
        includeRankMeta &&
        String((item as { label?: unknown }).label ?? "")
          .trim()
          .toLowerCase() === "tba"
      ) {
        key = `${slug}_${seenItemIds.size + 1}`;
      }
      if (seenItemIds.has(key)) continue;
      const label =
        String((item as { label?: unknown }).label ?? "").trim() || slug;
      seenItemIds.add(key);

      if (includeRankMeta) {
        const rawCooldown = Number((item as { cooldown?: unknown }).cooldown);
        items.push({
          slug,
          label,
          abbr: String((item as { abbr?: unknown }).abbr ?? "").trim(),
          cooldown: Number.isFinite(rawCooldown)
            ? Math.max(0, Math.trunc(rawCooldown))
            : 0,
          description: String(
            (item as { description?: unknown }).description ?? "",
          ).trim(),
          iconUrl: String((item as { iconUrl?: unknown }).iconUrl ?? "").trim(),
        });
      } else {
        items.push({ slug, label });
      }
    }

    out.push({ id, title, items } as TrainingCategory | RankCategoryDefinition);
  }

  return out as TrainingCategory[] | RankCategoryDefinition[];
}

export function normalizeAdminDepartments(input: unknown): AdminDepartment[] {
  if (!Array.isArray(input)) return [];
  const out: AdminDepartment[] = [];
  const seenSections = new Set<string>();

  for (const section of input) {
    if (!section || typeof section !== "object") continue;
    const title = String(section.title ?? "").trim();
    const id = normalizeSlug(section.id) || slugifyInput(section.id || title);
    if (!id || seenSections.has(id) || !title) continue;
    seenSections.add(id);

    const normalizedSubcategories: AdminDepartmentSubcategory[] = [];
    const seenSubcategories = new Set<string>();
    const rawSubcategories = Array.isArray(section.subcategories)
      ? section.subcategories
      : [];

    if (!rawSubcategories.length && Array.isArray(section.positions)) {
      rawSubcategories.push({
        id: `${id}_general`,
        title: "General",
        positions: section.positions,
      });
    }

    for (const sub of rawSubcategories) {
      if (!sub || typeof sub !== "object") continue;
      const subTitle = String(sub.title ?? "").trim();
      const subId =
        normalizeSlug(sub.id) || slugifyInput(sub.id || `${id}_${subTitle}`);
      if (!subId || seenSubcategories.has(subId) || !subTitle) continue;
      seenSubcategories.add(subId);

      const items: AdminDepartmentPosition[] = [];
      const seenPositions = new Set<string>();
      const rawItems = Array.isArray(sub.positions) ? sub.positions : [];

      for (const pos of rawItems) {
        if (!pos || typeof pos !== "object") continue;
        const name = String(pos.name ?? "").trim();
        const posId =
          normalizeSlug(pos.id) || slugifyInput(pos.id || `${subId}_${name}`);
        if (!name || !posId || seenPositions.has(posId)) continue;
        seenPositions.add(posId);
        const rawStatus = String(pos.status ?? "")
          .trim()
          .toLowerCase();
        items.push({
          id: posId,
          name,
          assignedUserId: String(pos.assignedUserId ?? "").trim(),
          status: rawStatus === "closed" ? "closed" : "open",
        });
      }

      normalizedSubcategories.push({
        id: subId,
        title: subTitle,
        positions: items,
      });
    }

    out.push({ id, title, subcategories: normalizedSubcategories });
  }

  return out;
}

export function normalizeRadioChannels(input: unknown): RadioChannelsSettings {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const shortRangeHeader =
    String((src as RadioChannelsSettings).shortRangeHeader ?? "Short Range Radio (SR)").trim() ||
    "Short Range Radio (SR)";
  const longRangeHeader =
    String((src as RadioChannelsSettings).longRangeHeader ?? "Long Range Radio (SR)").trim() ||
    "Long Range Radio (SR)";
  const longRangeFrequencyLabel =
    String((src as RadioChannelsSettings).longRangeFrequencyLabel ?? "LR Frequency").trim() ||
    "LR Frequency";
  const rawColumns = Array.isArray((src as RadioChannelsSettings).columns)
    ? (src as RadioChannelsSettings).columns
    : [];
  const columns: RadioChannelColumn[] = [];
  const seen = new Set<string>();

  for (const column of rawColumns) {
    if (!column || typeof column !== "object") continue;
    const title = String(column.title ?? "").trim();
    const id = normalizeSlug(column.id) || slugifyInput(column.id || title);
    if (!title || !id || seen.has(id)) continue;
    seen.add(id);
    columns.push({
      id,
      title,
      squadRadioNet: String(column.squadRadioNet ?? "").trim(),
      fireteamRadioNetRed: String(column.fireteamRadioNetRed ?? "").trim(),
      fireteamRadioNetBlue: String(column.fireteamRadioNetBlue ?? "").trim(),
      longRangeRole: String(column.longRangeRole ?? "").trim(),
      longRangeFrequency: String(column.longRangeFrequency ?? "").trim(),
    });
  }

  return {
    shortRangeHeader,
    longRangeHeader,
    longRangeFrequencyLabel,
    columns,
  };
}

function deriveAssignmentsFromOrbat(orbatSettings: SrSettings["orbatSettings"]) {
  const byKey = new Map<
    string,
    { title: string; positions: string[]; seenPos: Set<string> }
  >();

  for (const category of orbatSettings.categories) {
    for (const group of category.groups) {
      const title = String(group.title ?? "").trim();
      if (!title) continue;
      const key = title.toLowerCase();
      let entry = byKey.get(key);
      if (!entry) {
        entry = { title, positions: [], seenPos: new Set() };
        byKey.set(key, entry);
      }
      for (const row of group.rows) {
        const pos = String(row.position ?? "").trim();
        if (!pos) continue;
        const pk = pos.toLowerCase();
        if (entry.seenPos.has(pk)) continue;
        entry.seenPos.add(pk);
        entry.positions.push(pos);
      }
    }
  }

  const assignments: string[] = [];
  const assignmentPositions: Record<string, string[]> = {};
  for (const entry of byKey.values()) {
    assignments.push(entry.title);
    assignmentPositions[entry.title] = entry.positions;
  }

  return { assignments, assignmentPositions };
}

export function normalizeSrSettings(input: unknown): SrSettings {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};

  const medals: MedalSettings[] = [];
  const seenMedals = new Set<string>();
  const rawMedals = Array.isArray((src as SrSettings).medals)
    ? (src as SrSettings).medals
    : [];
  for (const medal of rawMedals) {
    if (!medal || typeof medal !== "object") continue;
    const slug = normalizeSlug(medal.slug);
    if (!slug || seenMedals.has(slug)) continue;
    const displayName = String(medal.displayName ?? "").trim();
    if (!displayName) continue;
    seenMedals.add(slug);
    medals.push({
      slug,
      displayName,
      pictureUrl: String(medal.pictureUrl ?? "").trim(),
      description: String(medal.description ?? "").trim(),
    });
  }

  const campaignRibbons: CampaignRibbonSettings[] = [];
  const seenCampaignRibbons = new Set<string>();
  const rawCampaignRibbons = Array.isArray((src as SrSettings).campaignRibbons)
    ? (src as SrSettings).campaignRibbons
    : [];
  for (const ribbon of rawCampaignRibbons) {
    if (!ribbon || typeof ribbon !== "object") continue;
    const slug = normalizeSlug(ribbon.slug);
    if (!slug || seenCampaignRibbons.has(slug)) continue;
    const displayName = String(ribbon.displayName ?? "").trim();
    if (!displayName) continue;
    seenCampaignRibbons.add(slug);
    campaignRibbons.push({
      slug,
      displayName,
      pictureUrl: String(ribbon.pictureUrl ?? "").trim(),
      description: String(ribbon.description ?? "").trim(),
    });
  }

  const orbatSettings = normalizeOrbatSettings((src as SrSettings).orbatSettings);
  const { assignments, assignmentPositions } = deriveAssignmentsFromOrbat(orbatSettings);

  const rawAssignments = Array.isArray((src as SrSettings).assignments)
    ? (src as SrSettings).assignments
    : assignments;
  const rawAssignmentPositions =
    (src as SrSettings).assignmentPositions &&
    typeof (src as SrSettings).assignmentPositions === "object" &&
    !Array.isArray((src as SrSettings).assignmentPositions)
      ? (src as SrSettings).assignmentPositions
      : assignmentPositions;

  return {
    trainingCategories: normalizeCategoryItems(
      (src as SrSettings).trainingCategories,
      false,
    ) as TrainingCategory[],
    rankCategories: normalizeCategoryItems(
      (src as SrSettings).rankCategories,
      true,
    ) as RankCategoryDefinition[],
    medals,
    campaignRibbons,
    orbatSettings,
    radioChannels: normalizeRadioChannels((src as SrSettings).radioChannels),
    assignments: rawAssignments.map((entry) => String(entry ?? "").trim()).filter(Boolean),
    assignmentPositions: Object.fromEntries(
      Object.entries(rawAssignmentPositions).map(([key, value]) => [
        key,
        Array.isArray(value)
          ? value.map((entry) => String(entry ?? "").trim()).filter(Boolean)
          : [],
      ]),
    ),
    adminDepartments: normalizeAdminDepartments((src as SrSettings).adminDepartments),
  };
}

export function emptySrSettings(): SrSettings {
  return normalizeSrSettings({});
}
