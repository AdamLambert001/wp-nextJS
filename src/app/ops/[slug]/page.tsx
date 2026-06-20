import { OperationDetailBoard } from "@/components/ops/operation-detail-board";

type OperationPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function OperationPage({ params }: OperationPageProps) {
  const { slug } = await params;
  return <OperationDetailBoard slug={slug} />;
}
