import {
  DEFAULT_GROUP_TRAINING_CATEGORY,
  TRAINING_CATEGORY_ANYONE,
} from "@/lib/orbat/constants";
import { slugifyInput } from "@/lib/orbat/normalize";
import type { OrbatCategory, OrbatGroup } from "@/lib/orbat/types";

export function inferTrainingCategoryId(
  orbatCategoryId: string,
  orbatGroupId: string,
): string {
  const categoryId = slugifyInput(orbatCategoryId);
  const groupId = slugifyInput(orbatGroupId);

  if (groupId === "zeus_team") return "zeus";
  if (groupId === "spartan_team" || groupId === "spartan_support") return "spartan";
  if (categoryId === "aviation") return "aviation";
  if (categoryId === "winter_company") return "infantry_roles";
  if (categoryId === "specialist_support") return "spartan";
  if (categoryId === "unit_headquarters") return "infantry_roles";

  return DEFAULT_GROUP_TRAINING_CATEGORY;
}

export function effectiveTrainingCategoryId(
  category: Pick<OrbatCategory, "id">,
  group: Pick<OrbatGroup, "id" | "trainingCategoryId">,
): string {
  const stored = slugifyInput(String(group.trainingCategoryId ?? "").trim());
  if (stored === TRAINING_CATEGORY_ANYONE) return TRAINING_CATEGORY_ANYONE;
  if (stored) return stored;
  return inferTrainingCategoryId(category.id, group.id);
}

export function shouldHideTrainingsColumn(trainingCategoryId: string): boolean {
  return trainingCategoryId === TRAINING_CATEGORY_ANYONE;
}
