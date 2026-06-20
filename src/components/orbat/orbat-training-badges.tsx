"use client";

import { Badge } from "@/components/ui/badge";
import { slugifyInput } from "@/lib/orbat/normalize";
import type { OrbatUserSummary, TrainingCategorySummary } from "@/lib/orbat/types";

type OrbatTrainingBadgesProps = {
  user: OrbatUserSummary | null;
  trainingCategoryId: string;
  trainingCategories: TrainingCategorySummary[];
};

export function OrbatTrainingBadges({
  user,
  trainingCategoryId,
  trainingCategories,
}: OrbatTrainingBadgesProps) {
  const categoryId = slugifyInput(trainingCategoryId);
  const category = trainingCategories.find(
    (entry) => slugifyInput(entry.id) === categoryId,
  );
  const items = category?.items ?? [];

  if (!items.length) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }

  if (!user) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const userSlugs = new Set(user.trainings);
  const matched = items.filter((item) =>
    userSlugs.has(String(item.slug ?? "").trim().toLowerCase()),
  );

  if (!matched.length) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {matched.map((item) => (
        <Badge
          key={item.slug}
          variant="secondary"
          className="border-green-800/60 bg-green-950/70 text-[0.7rem] text-green-100"
        >
          {item.label || item.slug}
        </Badge>
      ))}
    </div>
  );
}
