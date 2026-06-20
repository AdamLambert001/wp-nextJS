import { randomUUID } from "crypto";
import type { LoreAsset, UnitLore } from "@/lib/lore/types";

const DEFAULT_CATEGORIES = ["Ship", "External Unit", "External Support"];
const MAX_BACKGROUND = 200_000;
const MAX_DESCRIPTION = 50_000;
const MAX_TITLE = 500;
const MAX_CATEGORY_LABEL = 120;

function dedupeCategories(arr: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of Array.isArray(arr) ? arr : []) {
    const value = String(raw ?? "").trim();
    if (!value || value.length > MAX_CATEGORY_LABEL) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out.length ? out : DEFAULT_CATEGORIES.slice();
}

function normalizeAsset(
  raw: unknown,
  catByLower: Map<string, string>,
  defaultCategoryLabel: string,
): LoreAsset | null {
  if (!raw || typeof raw !== "object") return null;
  let id = String((raw as LoreAsset).id ?? "").trim();
  if (!id) id = randomUUID();
  const title = String((raw as LoreAsset).title ?? "")
    .trim()
    .slice(0, MAX_TITLE);
  if (!title) return null;

  let category = String((raw as LoreAsset).category ?? "").trim();
  if (!category || category.length > MAX_CATEGORY_LABEL) {
    category = defaultCategoryLabel;
  } else {
    const resolved = catByLower.get(category.toLowerCase());
    category = resolved || defaultCategoryLabel;
  }

  const description = String((raw as LoreAsset).description ?? "")
    .trim()
    .slice(0, MAX_DESCRIPTION);
  const pictureUrl = String((raw as LoreAsset).pictureUrl ?? "")
    .trim()
    .slice(0, 2000);

  return { id, title, category, description, pictureUrl };
}

export function normalizeUnitLore(raw: unknown): UnitLore {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const backgroundLore = String((src as UnitLore).backgroundLore ?? "").slice(
    0,
    MAX_BACKGROUND,
  );
  const assetCategories = dedupeCategories((src as UnitLore).assetCategories);
  const catByLower = new Map<string, string>();
  for (const category of assetCategories) {
    catByLower.set(category.toLowerCase(), category);
  }
  const defaultCategoryLabel = assetCategories[0] || DEFAULT_CATEGORIES[0];
  const assetsIn = Array.isArray((src as UnitLore).assets)
    ? (src as UnitLore).assets
    : [];
  const assets: LoreAsset[] = [];
  const seenIds = new Set<string>();

  for (const row of assetsIn) {
    const asset = normalizeAsset(row, catByLower, defaultCategoryLabel);
    if (!asset) continue;
    if (seenIds.has(asset.id)) {
      asset.id = randomUUID();
    }
    seenIds.add(asset.id);
    assets.push(asset);
  }

  return { backgroundLore, assetCategories, assets };
}

export function emptyUnitLore(): UnitLore {
  return {
    backgroundLore: "",
    assetCategories: DEFAULT_CATEGORIES.slice(),
    assets: [],
  };
}
