import { BadgeAvatar } from "@/components/shadcn-studio/badge/badge-22";

type ServiceRecordMemberBadgeProps = {
  name: string;
  avatarUrl: string;
  profileId: string;
};

export function ServiceRecordMemberBadge({
  name,
  avatarUrl,
  profileId,
}: ServiceRecordMemberBadgeProps) {
  return (
    <BadgeAvatar
      label={name}
      imageSrc={avatarUrl}
      imageAlt={name}
      href={`/profile/${encodeURIComponent(profileId)}`}
    />
  );
}
