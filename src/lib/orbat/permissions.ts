import type { DiscordPermissionFlags } from "@/lib/rbac/discord-role-mapper";
import type { OrbatCapabilities, OrbatSettings } from "@/lib/orbat/types";

function normalizeOrbatForStructureCompare(orbat: OrbatSettings): OrbatSettings {
  return {
    categories: orbat.categories.map((cat) => ({
      id: String(cat.id ?? ""),
      title: String(cat.title ?? ""),
      groups: cat.groups.map((group) => ({
        id: String(group.id ?? ""),
        title: String(group.title ?? ""),
        color: String(group.color ?? ""),
        backgroundImage: String(group.backgroundImage ?? ""),
        trainingCategoryId: String(group.trainingCategoryId ?? ""),
        rows: group.rows.map((row) => ({
          id: String(row.id ?? ""),
          position: String(row.position ?? ""),
          assignedUserId: "",
          lastEditedAt: "",
        })),
      })),
    })),
  };
}

export function orbatStructureUnchanged(
  currentOrbat: OrbatSettings,
  incomingOrbat: OrbatSettings,
): boolean {
  const a = normalizeOrbatForStructureCompare(currentOrbat);
  const b = normalizeOrbatForStructureCompare(incomingOrbat);
  return JSON.stringify(a) === JSON.stringify(b);
}

export function getOrbatCapabilities(flags: DiscordPermissionFlags): OrbatCapabilities {
  const canEditStructure = flags.canManageServer || flags.srAdmin;
  const canAssignPositions =
    flags.canManageServer || flags.srAdmin || flags.srSquadLeader;

  return {
    canEditStructure,
    canAssignPositions,
    canEdit: canEditStructure || canAssignPositions,
  };
}
