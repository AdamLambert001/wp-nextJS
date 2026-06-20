export type DetachmentTagConfig = {
  title: string;
  color: string;
  icon: string;
};

export type DetachmentTagEntry = DetachmentTagConfig & {
  categoryTitle: string;
  isPersisted: boolean;
};

export type DetachmentTagLookup = Record<
  string,
  {
    title: string;
    color: string;
    icon: string;
  }
>;

const TAG_COLOR_PALETTE = [
  "#e11d48",
  "#ea580c",
  "#d97706",
  "#65a30d",
  "#059669",
  "#0891b2",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#475569",
] as const;

export function normalizeDetachmentTitleKey(title: string): string {
  return String(title ?? "").trim().toLowerCase();
}

export function normalizeDetachmentHexColor(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : "";
}

export function randomColorForDetachment(title: string): string {
  let hash = 0;
  const input = String(title ?? "").trim();
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return TAG_COLOR_PALETTE[hash % TAG_COLOR_PALETTE.length];
}

export function contrastTextColor(hexColor: string): string {
  const normalized = normalizeDetachmentHexColor(hexColor);
  if (!normalized) return "#ffffff";

  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? "#0f172a" : "#ffffff";
}

export function resolveDetachmentTagForAssignment(
  assignment: string | null | undefined,
  lookup: DetachmentTagLookup,
) {
  const key = normalizeDetachmentTitleKey(String(assignment ?? ""));
  if (!key) return null;
  return lookup[key] ?? null;
}
