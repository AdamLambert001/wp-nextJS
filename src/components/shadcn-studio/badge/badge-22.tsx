import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeAvatarProps = {
  label: string;
  imageSrc: string;
  imageAlt?: string;
  href?: string;
};

export function BadgeAvatar({ label, imageSrc, imageAlt = "", href }: BadgeAvatarProps) {
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "h-auto max-w-full gap-1.5 p-1 pr-2",
        href && "transition-colors hover:bg-muted/50",
      )}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={24}
        height={24}
        className="size-6 shrink-0 rounded-full bg-muted object-cover"
        unoptimized
      />
      <span className="truncate font-medium">{label}</span>
    </Badge>
  );

  if (!href) {
    return badge;
  }

  return (
    <Link
      href={href}
      className="inline-flex max-w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Open ${label}'s profile`}
    >
      {badge}
    </Link>
  );
}

const BadgeAvatarDemo = () => {
  return (
    <BadgeAvatar
      label="Avatar"
      imageSrc="https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png"
      imageAlt="Hallie Richards"
    />
  );
};

export default BadgeAvatarDemo;
