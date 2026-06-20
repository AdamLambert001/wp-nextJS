import type { CampaignAttendanceEntry } from "@/lib/profile/types";
import { prisma } from "@/lib/prisma";

export function computeCampaignAttendanceStats(attended: number, total: number) {
  const attendedOps = Number.isFinite(Number(attended)) ? Number(attended) : 0;
  const totalOps = Number.isFinite(Number(total)) ? Number(total) : 0;
  const rawRatio = totalOps > 0 ? attendedOps / totalOps : 0;
  const roundedToThresholdRatio =
    rawRatio >= 0.6 && rawRatio < 0.75 ? 0.75 : rawRatio;
  const qualified = roundedToThresholdRatio >= 0.75;

  return {
    attendedOps,
    totalOps,
    ratio: rawRatio,
    ratioPercent: Math.round(rawRatio * 100),
    thresholdPercent: 75,
    thresholdReachedByRounding: rawRatio >= 0.6 && rawRatio < 0.75,
    qualified,
  };
}

export async function computeCampaignAttendanceForProfileId(
  profileId: string,
): Promise<CampaignAttendanceEntry[]> {
  const pid = String(profileId ?? "").trim();
  if (!pid) return [];

  const [campaigns, operations] = await Promise.all([
    prisma.campaign.findMany({
      select: { id: true, slug: true, title: true },
    }),
    prisma.operation.findMany({
      select: {
        campaignId: true,
        attendees: {
          select: { serviceRecordId: true },
        },
      },
    }),
  ]);

  const out: CampaignAttendanceEntry[] = [];

  for (const campaign of campaigns) {
    const campaignId = String(campaign.id ?? "").trim();
    if (!campaignId) continue;

    const linked = operations.filter(
      (operation) => String(operation.campaignId ?? "").trim() === campaignId,
    );
    const total = linked.length;
    if (!total) continue;

    let attended = 0;
    for (const operation of linked) {
      if (
        operation.attendees.some(
          (attendee) => String(attendee.serviceRecordId ?? "").trim() === pid,
        )
      ) {
        attended += 1;
      }
    }

    const stats = computeCampaignAttendanceStats(attended, total);
    if (!stats.qualified) continue;

    out.push({
      campaignId,
      campaignSlug: String(campaign.slug ?? "").trim(),
      campaignTitle: String(campaign.title ?? "Campaign").trim() || "Campaign",
      ...stats,
    });
  }

  out.sort(
    (a, b) =>
      b.ratio - a.ratio ||
      b.attendedOps - a.attendedOps ||
      a.campaignTitle.localeCompare(b.campaignTitle),
  );

  return out;
}
