import { redirect } from "next/navigation";

type LegacyProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyProfileDetailPage({ params }: LegacyProfilePageProps) {
  const { id } = await params;
  redirect(`/profile/${encodeURIComponent(id)}`);
}
