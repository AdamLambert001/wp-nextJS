import { contrastTextColor } from "@/lib/admin/detachment-tags.shared";
import { DynamicLucideIcon } from "@/components/admin/dynamic-lucide-icon";
import { cn } from "@/lib/utils";

type DetachmentTagBadgeProps = {
  title: string;
  color: string;
  icon?: string | null;
  className?: string;
};

export function DetachmentTagBadge({ title, color, icon, className }: DetachmentTagBadgeProps) {
  const textColor = contrastTextColor(color);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border border-black/10 px-2.5 py-0.5 text-xs font-medium shadow-sm",
        className,
      )}
      style={{ backgroundColor: color, color: textColor }}
    >
      <DynamicLucideIcon name={icon} className="size-3 shrink-0" />
      <span className="truncate">{title}</span>
    </span>
  );
}
