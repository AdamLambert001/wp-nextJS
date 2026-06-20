import { slugifyInput } from "@/lib/sr-settings/slug";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";
import { saveSrSettingsWithOrbatAssignments } from "@/lib/sr-settings/save";

export type AddMedalInput = {
  slug: string;
  displayName: string;
  pictureUrl?: string;
  description?: string;
};

export async function addMedal(input: AddMedalInput) {
  const slug = slugifyInput(input.slug);
  const displayName = String(input.displayName ?? "").trim();
  const pictureUrl = String(input.pictureUrl ?? "").trim();
  const description = String(input.description ?? "").trim();

  if (!slug) throw new Error("Slug is required.");
  if (!displayName) throw new Error("Display name is required.");

  const settings = await loadSrSettingsFromDb();
  if (settings.medals.some((medal) => String(medal.slug ?? "").toLowerCase() === slug)) {
    throw new Error("A medal with this slug already exists.");
  }

  const medals = [
    ...settings.medals,
    { slug, displayName, pictureUrl, description },
  ];

  const saved = await saveSrSettingsWithOrbatAssignments({
    ...settings,
    medals,
  });

  return { settings: saved };
}

export type UpdateMedalInput = {
  slug: string;
  displayName: string;
  pictureUrl?: string;
  description?: string;
};

export async function updateMedal(input: UpdateMedalInput) {
  const slug = slugifyInput(input.slug);
  const displayName = String(input.displayName ?? "").trim();
  const pictureUrl = String(input.pictureUrl ?? "").trim();
  const description = String(input.description ?? "").trim();

  if (!slug) throw new Error("Slug is required.");
  if (!displayName) throw new Error("Display name is required.");

  const settings = await loadSrSettingsFromDb();
  const index = settings.medals.findIndex(
    (medal) => String(medal.slug ?? "").toLowerCase() === slug,
  );
  if (index < 0) throw new Error("Medal not found.");

  const medals = [...settings.medals];
  medals[index] = { slug, displayName, pictureUrl, description };

  const saved = await saveSrSettingsWithOrbatAssignments({
    ...settings,
    medals,
  });

  return { settings: saved };
}

export type AddRibbonInput = {
  slug: string;
  displayName: string;
  pictureUrl?: string;
  description?: string;
};

export async function addRibbon(input: AddRibbonInput) {
  const slug = slugifyInput(input.slug);
  const displayName = String(input.displayName ?? "").trim();
  const pictureUrl = String(input.pictureUrl ?? "").trim();
  const description = String(input.description ?? "").trim();

  if (!slug) throw new Error("Slug is required.");
  if (!displayName) throw new Error("Display name is required.");

  const settings = await loadSrSettingsFromDb();
  if (
    settings.campaignRibbons.some(
      (ribbon) => String(ribbon.slug ?? "").toLowerCase() === slug,
    )
  ) {
    throw new Error("A ribbon with this slug already exists.");
  }

  const campaignRibbons = [
    ...settings.campaignRibbons,
    { slug, displayName, pictureUrl, description },
  ];

  const saved = await saveSrSettingsWithOrbatAssignments({
    ...settings,
    campaignRibbons,
  });

  return { settings: saved };
}

export type UpdateRibbonInput = {
  slug: string;
  displayName: string;
  pictureUrl?: string;
  description?: string;
};

export async function updateRibbon(input: UpdateRibbonInput) {
  const slug = slugifyInput(input.slug);
  const displayName = String(input.displayName ?? "").trim();
  const pictureUrl = String(input.pictureUrl ?? "").trim();
  const description = String(input.description ?? "").trim();

  if (!slug) throw new Error("Slug is required.");
  if (!displayName) throw new Error("Display name is required.");

  const settings = await loadSrSettingsFromDb();
  const index = settings.campaignRibbons.findIndex(
    (ribbon) => String(ribbon.slug ?? "").toLowerCase() === slug,
  );
  if (index < 0) throw new Error("Ribbon not found.");

  const campaignRibbons = [...settings.campaignRibbons];
  campaignRibbons[index] = { slug, displayName, pictureUrl, description };

  const saved = await saveSrSettingsWithOrbatAssignments({
    ...settings,
    campaignRibbons,
  });

  return { settings: saved };
}
