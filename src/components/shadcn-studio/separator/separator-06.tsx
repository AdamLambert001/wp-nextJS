import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function GradientSeparator({ className }: { className?: string }) {
  return (
    <Separator
      className={cn(
        "via-border bg-transparent bg-linear-to-r from-transparent to-transparent",
        className,
      )}
    />
  );
}
