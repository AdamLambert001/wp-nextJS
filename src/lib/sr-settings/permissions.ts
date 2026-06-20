import type { DiscordPermissionFlags } from "@/lib/rbac/discord-role-mapper";
import type { SrCapabilities } from "@/lib/sr-settings/types";

export function effectiveSrAdmin(flags: DiscordPermissionFlags): boolean {
  return flags.canManageServer || flags.srAdmin;
}

export function isPanelAdmin(flags: DiscordPermissionFlags): boolean {
  return flags.canManageServer;
}

export function isOrbatAdmin(flags: DiscordPermissionFlags): boolean {
  return flags.srAdmin;
}

/** Ranks, radios, and admin departments boards. */
export function canEditSrBoards(flags: DiscordPermissionFlags): boolean {
  return isPanelAdmin(flags) || isOrbatAdmin(flags);
}

export function canEditLore(flags: DiscordPermissionFlags): boolean {
  return effectiveSrAdmin(flags) || flags.srZeus;
}

export function canEditMemberList(flags: DiscordPermissionFlags): boolean {
  return (
    flags.canManageServer ||
    flags.srAdmin ||
    flags.srTrainer ||
    flags.srSquadLeader
  );
}

export function hasSrStudioAccess(flags: DiscordPermissionFlags): boolean {
  return (
    flags.canManageServer ||
    flags.srAdmin ||
    flags.srSquadLeader ||
    flags.srTrainer ||
    flags.srRecruiter
  );
}

export function getSrCapabilities(
  flags: DiscordPermissionFlags,
  authenticated: boolean,
): SrCapabilities {
  const admin = effectiveSrAdmin(flags);
  const panelAdmin = isPanelAdmin(flags);
  const sq = flags.srSquadLeader;
  const tr = flags.srTrainer;
  const rec = flags.srRecruiter;
  const studio = hasSrStudioAccess(flags);
  const canEditOrbatStructure = panelAdmin || flags.srAdmin;
  const canAssignOrbatPositions = panelAdmin || flags.srAdmin || sq;
  const canEditSrConfigurationBoards = canEditSrBoards(flags);
  const canEditRankBoard = canEditSrConfigurationBoards;
  const canEditRadiosBoard = canEditSrConfigurationBoards;
  const canEditAdminDepartments = canEditSrConfigurationBoards;
  const canEditUnitLore = canEditLore(flags);
  const canEdit =
    canEditOrbatStructure ||
    canAssignOrbatPositions ||
    canEditRankBoard ||
    canEditRadiosBoard ||
    canEditAdminDepartments ||
    canEditUnitLore ||
    tr ||
    rec;

  return {
    authenticated,
    effectiveSrAdmin: admin,
    canManageServer: panelAdmin,
    canEditMemberList: canEditMemberList(flags),
    srSquadLeader: sq,
    srTrainer: tr,
    srRecruiter: rec,
    canEditOrbatStructure,
    canAssignOrbatPositions,
    canEditRankBoard,
    canEditRadiosBoard,
    canEditAdminDepartments,
    canEditLore: canEditUnitLore,
    canOpenSrStudio: studio,
    canEdit,
  };
}
