export function todayIsoDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function composeSrPickLabel(row: {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}): string {
  const firstName = String(row.firstName ?? "").trim();
  const lastName = String(row.lastName ?? "").trim();
  const nickname = String(row.displayName ?? "").trim();
  const firstInitialSource = firstName || nickname;
  const firstInitial = firstInitialSource
    ? `${firstInitialSource.charAt(0).toUpperCase()}.`
    : "";
  const nicknamePart = nickname ? `"${nickname}"` : "";
  const parts = [firstInitial, nicknamePart, lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);

  if (parts.length) return parts.join(" ");
  const id = String(row.id ?? "").trim();
  return id || "(no name)";
}

export function formatSubjectFromRecord(row: {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
}): string {
  return composeSrPickLabel(row);
}

export function humanizeSlug(slug: string): string {
  return String(slug ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function catalogDisplayName(
  displayName: string | undefined | null,
  slug: string,
): string {
  const name = String(displayName ?? "").trim();
  return name || humanizeSlug(slug);
}

export function parseOperationLabelFromAttendanceNote(note: string): string {
  const match = /\(Operation:\s*([^)]+)\)/i.exec(String(note ?? ""));
  return match ? String(match[1] ?? "").trim() : "";
}
