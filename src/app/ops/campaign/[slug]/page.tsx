import Link from "next/link";
import { notFound } from "next/navigation";
import { OpsMarkdown } from "@/components/ops/ops-markdown";
import { OpsShell } from "@/components/ops/ops-shell";
import { formatCampaignIsoDate, progressBadgeClass } from "@/components/ops/ops-utils";
import { getCampaignBySlug } from "@/lib/ops/store";

type CampaignPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CampaignDetailPage({ params }: CampaignPageProps) {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);

  if (!campaign) {
    notFound();
  }

  const start = campaign.startDate ? formatCampaignIsoDate(campaign.startDate) : "Unknown";
  const end = campaign.endDate ? formatCampaignIsoDate(campaign.endDate) : "Unknown";

  return (
    <OpsShell orbitron className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        <h1 className="ops-title m-0 text-center text-xl">{campaign.title}</h1>
        <span className={`ops-progress ${progressBadgeClass(campaign.progress)}`}>
          {campaign.progress || "Planned"}
        </span>
      </div>

      <div className="ops-panel">
        <div className="ops-meta mb-4">
          <div>Start: {start}</div>
          <div>End: {end}</div>
        </div>

        {campaign.overview ? (
          <div className="ops-section">
            <h2>Overview</h2>
            <OpsMarkdown text={campaign.overview} className="ops-desc" />
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/ops?campaign=${encodeURIComponent(campaign.slug)}#campaign-${campaign.slug}`}
            className="ops-btn"
          >
            Open in Ops dashboard
          </Link>
          <Link href="/ops" className="ops-btn">
            All operations
          </Link>
        </div>
      </div>
    </OpsShell>
  );
}
