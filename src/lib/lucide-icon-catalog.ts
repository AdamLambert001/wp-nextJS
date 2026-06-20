import dynamicIconImports from "lucide-react/dynamicIconImports";

export type LucideIconEntry = {
  kebab: string;
  name: string;
  label: string;
  searchText: string;
};

const iconImportKeys = new Set(Object.keys(dynamicIconImports));

function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function pascalToKebab(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function buildLucideIconEntries(): LucideIconEntry[] {
  const byName = new Map<string, LucideIconEntry>();

  for (const kebab of Object.keys(dynamicIconImports).sort()) {
    const name = kebabToPascal(kebab);
    if (byName.has(name)) continue;

    const label = kebab.replace(/-/g, " ");
    byName.set(name, {
      kebab,
      name,
      label,
      searchText: `${name} ${kebab} ${label}`.toLowerCase(),
    });
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const LUCIDE_ICON_ENTRIES = buildLucideIconEntries();

export function resolveLucideIconKebab(name: string | null | undefined): string | null {
  const key = String(name ?? "").trim();
  if (!key) return null;

  if (iconImportKeys.has(key)) return key;

  const fromPascal = pascalToKebab(key);
  if (iconImportKeys.has(fromPascal)) return fromPascal;

  const fromLower = key.toLowerCase();
  if (iconImportKeys.has(fromLower)) return fromLower;

  return null;
}

export function isLucideIconName(value: string | null | undefined): boolean {
  return Boolean(resolveLucideIconKebab(value));
}

export function normalizeLucideIconName(value: string | null | undefined): string {
  const kebab = resolveLucideIconKebab(value);
  return kebab ? kebabToPascal(kebab) : "";
}

export function getLucideIconEntry(name: string | null | undefined): LucideIconEntry | null {
  const normalized = normalizeLucideIconName(name);
  if (!normalized) return null;
  return LUCIDE_ICON_ENTRIES.find((entry) => entry.name === normalized) ?? null;
}

export async function loadLucideIconComponent(name: string | null | undefined) {
  const kebab = resolveLucideIconKebab(name);
  if (!kebab) return null;

  const loader = dynamicIconImports[kebab as keyof typeof dynamicIconImports];
  if (!loader) return null;

  const mod = await loader();
  return mod.default;
}

export function searchLucideIcons(query: string, limit = 200): LucideIconEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return LUCIDE_ICON_ENTRIES.slice(0, limit);
  }

  const matches: LucideIconEntry[] = [];
  for (const entry of LUCIDE_ICON_ENTRIES) {
    if (!entry.searchText.includes(needle)) continue;
    matches.push(entry);
    if (matches.length >= limit) break;
  }

  return matches;
}
