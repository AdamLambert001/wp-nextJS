import { loadOrbatSettingsFromDb } from "@/lib/orbat/load";
import { normalizeOrbatSettings } from "@/lib/orbat/normalize";
import { getOrbatCapabilities, orbatStructureUnchanged } from "@/lib/orbat/permissions";
import { applyOrbatAssignments, saveOrbatSettings } from "@/lib/orbat/save";
import type { OrbatSettings } from "@/lib/orbat/types";
import type { AccessContext } from "@/lib/rbac/types";

export type OrbatSaveResult = {
  orbatSettings: OrbatSettings;
  assignmentResult: Awaited<ReturnType<typeof applyOrbatAssignments>>;
};

export async function applyOrbatSave(
  access: AccessContext,
  orbatSettings: unknown,
): Promise<OrbatSaveResult> {
  if (
    orbatSettings === undefined ||
    typeof orbatSettings !== "object" ||
    orbatSettings === null ||
    Array.isArray(orbatSettings)
  ) {
    throw new Error("orbatSettings must be an object");
  }

  const incoming = normalizeOrbatSettings(orbatSettings);
  const capabilities = getOrbatCapabilities(access.flags);

  if (!capabilities.canEditStructure) {
    const current = await loadOrbatSettingsFromDb();
    if (!orbatStructureUnchanged(current, incoming)) {
      throw new Error("You may only change ORBAT assignments, not structure.");
    }
  }

  const saved = await saveOrbatSettings(incoming);
  const assignmentResult = await applyOrbatAssignments(saved);

  return { orbatSettings: saved, assignmentResult };
}
