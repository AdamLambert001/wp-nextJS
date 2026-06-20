"use client";

import { GradientSeparator } from "@/components/shadcn-studio/separator/separator-06";
import { AnimatedCollapse, AnimatedCollapseChevron } from "@/components/ui/animated-collapse";
import type { ReactNode } from "react";

type AdminCollapsibleSectionProps = {
  id: string;
  title: string;
  description?: string;
  open: boolean;
  onToggle: (id: string) => void;
  showSeparatorBefore?: boolean;
  children: ReactNode;
};

export function AdminCollapsibleSection({
  id,
  title,
  description,
  open,
  onToggle,
  showSeparatorBefore = false,
  children,
}: AdminCollapsibleSectionProps) {
  return (
    <section className="space-y-4">
      {showSeparatorBefore ? <GradientSeparator /> : null}
      <button
        type="button"
        className="flex w-full items-start gap-2 rounded-md text-left transition-colors hover:text-foreground/80"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <AnimatedCollapseChevron open={open} className="mt-1" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </button>
      <AnimatedCollapse open={open}>{children}</AnimatedCollapse>
    </section>
  );
}
