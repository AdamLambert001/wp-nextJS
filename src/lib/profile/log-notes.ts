export function utcTodayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function parseAwardDateToUtcMidnight(yyyyMmDd: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(yyyyMmDd ?? "").trim());
  if (!match) return utcTodayDate();
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function resolveActorLabel(input: {
  name?: string | null;
  discordId?: string | null;
  discordName?: string | null;
}): string {
  const displayName = String(input.name ?? "").trim();
  if (displayName) return displayName;
  const discordName = String(input.discordName ?? "").trim();
  if (discordName) return discordName;
  const discordId = String(input.discordId ?? "").trim();
  if (discordId) return `Discord user ${discordId}`;
  return "Staff";
}

export function noteAttendance(
  subject: string,
  dateStr: string,
  actor: string,
  operationLabel: string,
): string {
  const sub = String(subject || "").trim() || "Member";
  const d = String(dateStr || "").trim();
  const a = String(actor || "").trim();
  const op = String(operationLabel || "").trim();
  const opPart = op ? ` (Operation: ${op})` : "";
  return `${sub} was marked attended for ${d}${opPart} by ${a} submitting the attendance form.`;
}

export function noteTraining(subject: string, trainingLabel: string, actor: string): string {
  const sub = String(subject || "").trim() || "Member";
  const t = String(trainingLabel || "").trim() || "training";
  const a = String(actor || "").trim();
  return `${sub} was marked trained on ${t} by ${a}.`;
}

export function noteRank(
  subject: string,
  direction: string,
  oldRank: string,
  newRank: string,
  actor: string,
): string {
  const sub = String(subject || "").trim() || "Member";
  const verb = direction === "demote" ? "demoted" : "promoted";
  const oldR = String(oldRank || "").trim() || "(unknown)";
  const newR = String(newRank || "").trim() || "(unknown)";
  const a = String(actor || "").trim();
  return `${sub} was ${verb} from "${oldR}" to "${newR}" by ${a}.`;
}

export function noteRankTransfer(
  subject: string,
  oldRank: string,
  oldCategoryTitle: string,
  newRank: string,
  newCategoryTitle: string,
  actor: string,
): string {
  const sub = String(subject || "").trim() || "Member";
  const oldR = String(oldRank || "").trim() || "(unknown)";
  const oldCat = String(oldCategoryTitle || "").trim() || "(unknown)";
  const newR = String(newRank || "").trim() || "(unknown)";
  const newCat = String(newCategoryTitle || "").trim() || "(unknown)";
  const a = String(actor || "").trim();
  return `${sub} was transferred from "${oldR}" (${oldCat}) to "${newR}" (${newCat}) by ${a}.`;
}

export function noteMedal(
  subject: string,
  displayName: string,
  awardedDateStr: string,
  actor: string,
): string {
  const sub = String(subject || "").trim() || "Member";
  const medal = String(displayName || "").trim() || "medal";
  const d = String(awardedDateStr || "").trim();
  const a = String(actor || "").trim();
  return `${sub} was awarded ${medal} for ${d} by ${a}.`;
}

export function noteRibbon(
  subject: string,
  displayName: string,
  awardedDateStr: string,
  actor: string,
): string {
  const sub = String(subject || "").trim() || "Member";
  const ribbon = String(displayName || "").trim() || "campaign ribbon";
  const d = String(awardedDateStr || "").trim();
  const a = String(actor || "").trim();
  return `${sub} was awarded ${ribbon} for ${d} by ${a}.`;
}
