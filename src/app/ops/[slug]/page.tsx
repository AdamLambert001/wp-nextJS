import { OperationDetailBoard } from "@/components/ops/operation-detail-board";
import { plainTextFromOpsMarkdown } from "@/components/ops/ops-utils";
import { getEnrichedOpByFriendlyName } from "@/lib/ops/store";
import { siteConfig } from "@/lib/site-config";
import type { Metadata } from "next";

type OperationPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: OperationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const operation = await getEnrichedOpByFriendlyName(slug);

  if (!operation) {
    return { title: `Operation not found — ${siteConfig.siteTitle}` };
  }

  const title = String(operation.Operationtitle || "Operation").trim();
  const description = plainTextFromOpsMarkdown(operation.opdescription);
  const fallbackDescription = `${title} operation briefing.`;

  return {
    title: `${title} — ${siteConfig.siteTitle}`,
    description: description || fallbackDescription,
    openGraph: {
      title,
      description: description || fallbackDescription,
      type: "article",
    },
  };
}

export default async function OperationPage({ params }: OperationPageProps) {
  const { slug } = await params;
  return <OperationDetailBoard slug={slug} />;
}
