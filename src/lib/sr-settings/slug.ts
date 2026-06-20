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
