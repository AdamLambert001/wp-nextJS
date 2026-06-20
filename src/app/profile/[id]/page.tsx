import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/profile-view";
import { composeProfileHeaderDisplayName } from "@/lib/profile/formatting";
import { loadProfileSettings, loadPublicProfileById } from "@/lib/profile/load";
import { getOrbatCapabilities } from "@/lib/orbat/permissions";
import { getAccess } from "@/lib/rbac/get-access";

type ProfileDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProfileDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const [profile, settings] = await Promise.all([
    loadPublicProfileById(id),
    loadProfileSettings(),
  ]);

  if (!profile) {
    return { title: "Profile not found" };
  }

  const title = composeProfileHeaderDisplayName(profile, settings.rankCategories);
  return {
    title,
    description: `${title} — Service profile.`,
    openGraph: {
      title,
      description: `${title} — Service profile.`,
      type: "profile",
    },
  };
}

export default async function ProfileDetailPage({ params }: ProfileDetailPageProps) {
  const { id } = await params;
  const access = await getAccess();
  const canDeleteLogs = getOrbatCapabilities(access.flags).canEditStructure;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <ProfileView profileId={id} canDeleteLogs={canDeleteLogs} />
    </main>
  );
}
