"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { loadLucideIconComponent } from "@/lib/lucide-icon-catalog";

type DynamicLucideIconProps = {
  name: string | null | undefined;
  className?: string;
};

export function DynamicLucideIcon({ name, className }: DynamicLucideIconProps) {
  const [Icon, setIcon] = useState<LucideIcon | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIcon(null);

    void loadLucideIconComponent(name).then((component) => {
      if (!cancelled) {
        setIcon(() => component);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!Icon) return null;
  return <Icon className={className} aria-hidden />;
}
