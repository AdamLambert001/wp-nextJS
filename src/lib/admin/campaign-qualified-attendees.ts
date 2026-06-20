import { computeCampaignAttendanceStats } from "@/lib/profile/campaign-attendance";
import { composeProfileHeaderDisplayName } from "@/lib/profile/formatting";
import { normalizeAwardsTupleArray } from "@/lib/admin/service-record-actions/awards";
import { prisma } from "@/lib/prisma";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";
import type { CampaignRibbonSettings } from "@/lib/sr-settings/types";

export type CampaignQualifiedAttendee = {
  serviceRecordId: string;
  memberLabel: string;
  existingRibbonSlugs: string[];
  attendedOps: number;
  totalOps: number;
  ratio: number;
  ratioPercent: number;
  thresholdPercent: number;
  thresholdReachedByRounding: boolean;
  qualified: boolean;
};

export type CampaignQualifiedGroup = {
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  totalOps: number;
  qualifiedCount: number;
  suggestedRibbonSlug: string;
  qualifiedAttendees: CampaignQualifiedAttendee[];
};

function normalizeOpLookupToken(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function suggestRibbonSlugForCampaign(
  campaign: { slug?: string | null; title?: string | null },
  ribbons: CampaignRibbonSettings[],
): string {
  const campSlug = normalizeOpLookupToken(String(campaign.slug ?? ""));
  const campTitle = String(campaign.title ?? "")
    .trim()
    .toLowerCase();

  for (const ribbon of ribbons) {
    const slug = String(ribbon.slug ?? "").trim();
    if (!slug) continue;
    if (normalizeOpLookupToken(slug) === campSlug) return slug.toLowerCase();
    const displayName = String(ribbon.displayName ?? "")
      .trim()
      .toLowerCase();
    if (displayName && displayName === campTitle) return slug.toLowerCase();
  }

  return ribbons.length ? String(ribbons[0]?.slug ?? "").trim().toLowerCase() : "";
}

export async function computeAllCampaignQualifiedAttendees(): Promise<CampaignQualifiedGroup[]> {
  const [campaigns, operations, rows, settings] = await Promise.all([
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
    prisma.serviceRecord.findMany({
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        rank: true,
        campaignRib: true,
      },
    }),
    loadSrSettingsFromDb(),
  ]);

  const ribbons = settings.campaignRibbons;
  const rankCategories = settings.rankCategories;
  const out: CampaignQualifiedGroup[] = [];

  for (const campaign of campaigns) {
    const campaignId = String(campaign.id ?? "").trim();
    if (!campaignId) continue;

    const linked = operations.filter(
      (operation) => String(operation.campaignId ?? "").trim() === campaignId,
    );
    const totalOps = linked.length;
    if (!totalOps) continue;

    const qualifiedAttendees: CampaignQualifiedAttendee[] = [];

    for (const row of rows) {
      const profileId = String(row.id ?? "").trim();
      if (!profileId) continue;

      let attended = 0;
      for (const operation of linked) {
        if (
          operation.attendees.some(
            (attendee) => String(attendee.serviceRecordId ?? "").trim() === profileId,
          )
        ) {
          attended += 1;
        }
      }

      const stats = computeCampaignAttendanceStats(attended, totalOps);
      if (!stats.qualified) continue;

      const existingRibbonSlugs = normalizeAwardsTupleArray(row.campaignRib, []).map(
        ([slug]) => slug,
      );

      qualifiedAttendees.push({
        serviceRecordId: profileId,
        memberLabel: composeProfileHeaderDisplayName(row, rankCategories),
        existingRibbonSlugs,
        ...stats,
      });
    }

    qualifiedAttendees.sort(
      (a, b) =>
        b.ratioPercent - a.ratioPercent ||
        b.attendedOps - a.attendedOps ||
        String(a.memberLabel ?? "").localeCompare(String(b.memberLabel ?? ""), undefined, {
          sensitivity: "base",
        }),
    );

    out.push({
      campaignId,
      campaignSlug: String(campaign.slug ?? "").trim(),
      campaignTitle: String(campaign.title ?? "Campaign").trim() || "Campaign",
      totalOps,
      qualifiedCount: qualifiedAttendees.length,
      suggestedRibbonSlug: suggestRibbonSlugForCampaign(campaign, ribbons),
      qualifiedAttendees,
    });
  }

  out.sort((a, b) =>
    String(a.campaignTitle ?? "").localeCompare(String(b.campaignTitle ?? ""), undefined, {
      sensitivity: "base",
    }),
  );

  return out;
}
