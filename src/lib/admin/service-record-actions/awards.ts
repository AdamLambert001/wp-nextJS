export type AwardTuple = [string, string];

export function normalizeAwardsTupleArray(
  input: unknown,
  fallback: AwardTuple[] = [],
): AwardTuple[] {
  if (!Array.isArray(input)) return fallback;
  const out: AwardTuple[] = [];

  for (const row of input) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const slug = String(row[0] ?? "").trim().toLowerCase();
    const date = String(row[1] ?? "").trim();
    if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    out.push([slug, date]);
  }

  return out;
}

export function removeOneMedalFromAwards(
  awards: unknown,
  medalSlug: string,
  awardedAt: string,
): { awards: AwardTuple[]; removed: boolean } {
  const slug = String(medalSlug ?? "").trim().toLowerCase();
  const date = String(awardedAt ?? "").trim();
  let removed = false;
  const next: AwardTuple[] = [];

  for (const row of normalizeAwardsTupleArray(awards, [])) {
    if (!removed && row[0] === slug && row[1] === date) {
      removed = true;
      continue;
    }
    next.push(row);
  }

  return { awards: next, removed };
}

function escapeRegExp(value: string): string {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function medalAwardLogPattern(medalName: string, awardedAt: string): RegExp {
  return new RegExp(
    `was awarded ${escapeRegExp(String(medalName ?? "").trim())} for ${escapeRegExp(String(awardedAt ?? "").trim())}\\b`,
  );
}
