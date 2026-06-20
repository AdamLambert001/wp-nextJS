"use server";

import { revalidatePath } from "next/cache";
import {
  assertEffectiveSrAdminAccess,
} from "@/lib/admin/service-record-actions/auth";
import { computeAllCampaignQualifiedAttendees } from "@/lib/admin/campaign-qualified-attendees";
import {
  awardCampaignRibbonBulk,
  type AwardCampaignRibbonBulkInput,
} from "@/lib/admin/service-record-actions/award-campaign-ribbon-bulk";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";

export async function listCampaignQualifiedAttendeesAction(): Promise<
  AdminActionResult<{
    thresholdPercent: number;
    thresholdNote: string;
    ribbons: Array<{ slug: string; displayName: string }>;
    campaigns: Awaited<ReturnType<typeof computeAllCampaignQualifiedAttendees>>;
  }>
> {
  try {
    await assertEffectiveSrAdminAccess();
    const [settings, campaigns] = await Promise.all([
      loadSrSettingsFromDb(),
      computeAllCampaignQualifiedAttendees(),
    ]);

    return {
      ok: true,
      data: {
        thresholdPercent: 75,
        thresholdNote:
          "Members at 75%+ campaign operation attendance qualify (60–74% rounded up, same as profiles).",
        ribbons: settings.campaignRibbons.map((ribbon) => ({
          slug: String(ribbon.slug ?? "").trim().toLowerCase(),
          displayName: String(ribbon.displayName || ribbon.slug || "").trim(),
        })),
        campaigns,
      },
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function awardCampaignRibbonBulkAction(
  input: AwardCampaignRibbonBulkInput,
): Promise<AdminActionResult<Awaited<ReturnType<typeof awardCampaignRibbonBulk>>>> {
  try {
    const access = await assertEffectiveSrAdminAccess();
    const data = await awardCampaignRibbonBulk(input, access);
    revalidatePath("/admin");
    return { ok: true, data };
  } catch (error) {
    return actionError(error);
  }
}
