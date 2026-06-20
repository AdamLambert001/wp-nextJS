import { getOpsDashboardBundle } from "@/lib/ops/store";

export type PublicCampaignSummary = {
  id: string;
  slug: string;
  title: string;
  startDate: string;
  endDate: string;
  loreDate: string;
  overview: string;
};

export type PublicOperationSummary = {
  opfreindlyname: string;
  campaignId: string;
  loreDate: string;
  postDate: string;
  title: string;
  missionStatement: string;
};

export async function loadPublicOpsBundle() {
  const bundle = await getOpsDashboardBundle();

  return {
    ok: true as const,
    version: bundle.version,
    campaigns: bundle.campaigns,
    operations: bundle.operations.map((operation) => ({
      ...operation,
      title: operation.Operationtitle,
      missionStatement: operation.missionstatement,
    })),
    ops: bundle.operations,
    campaignsSummary: bundle.campaigns.map((campaign) => ({
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      loreDate: campaign.loreDate,
      overview: campaign.overview,
    })) satisfies PublicCampaignSummary[],
    operationsSummary: bundle.operations.map((operation) => ({
      opfreindlyname: operation.opfreindlyname,
      campaignId: operation.campaignId ?? "",
      loreDate: operation.loreDate,
      postDate: operation.postDate,
      title: operation.Operationtitle,
      missionStatement: operation.missionstatement,
    })) satisfies PublicOperationSummary[],
  };
}
