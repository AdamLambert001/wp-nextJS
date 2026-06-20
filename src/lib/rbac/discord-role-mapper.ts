import type { DiscordRole } from "@/generated/prisma/client";
import { Permission } from "@/lib/rbac/permissions";

export type DiscordPermissionFlags = {
  canUpload: boolean;
  canControlServers: boolean;
  canControlMain: boolean;
  canControlGames: boolean;
  canControlFunOps: boolean;
  canControlOther: boolean;
  canManageServer: boolean;
  canDeleteServers: boolean;
  canManageMods: boolean;
  canDeleteMissions: boolean;
  canViewConsole: boolean;
  srAdmin: boolean;
  srSquadLeader: boolean;
  srTrainer: boolean;
  srRecruiter: boolean;
  srZeus: boolean;
  allowedCategoryIds: string[];
};

export const EMPTY_DISCORD_PERMISSIONS: DiscordPermissionFlags = {
  canUpload: false,
  canControlServers: false,
  canControlMain: false,
  canControlGames: false,
  canControlFunOps: false,
  canControlOther: false,
  canManageServer: false,
  canDeleteServers: false,
  canManageMods: false,
  canDeleteMissions: false,
  canViewConsole: false,
  srAdmin: false,
  srSquadLeader: false,
  srTrainer: false,
  srRecruiter: false,
  srZeus: false,
  allowedCategoryIds: [],
};

export function discordRoleToFlags(row: DiscordRole | null): DiscordPermissionFlags {
  if (!row) {
    return { ...EMPTY_DISCORD_PERMISSIONS };
  }

  return {
    canUpload: row.canUpload,
    canControlServers: row.canControlServers,
    canControlMain: row.canControlMain,
    canControlGames: row.canControlGames,
    canControlFunOps: row.canControlFunOps,
    canControlOther: row.canControlOther,
    canManageServer: row.canManageServer,
    canDeleteServers: row.canDeleteServers,
    canManageMods: row.canManageMods,
    canDeleteMissions: row.canDeleteMissions,
    canViewConsole: row.canViewConsole,
    srAdmin: row.srAdmin,
    srSquadLeader: row.srSquadLeader,
    srTrainer: row.srTrainer,
    srRecruiter: row.srRecruiter,
    srZeus: row.srZeus,
    allowedCategoryIds: Array.isArray(row.allowedCategoryIds)
      ? row.allowedCategoryIds
      : [],
  };
}

export function permissionsFromDiscordRole(row: DiscordRole | null): Set<Permission> {
  const flags = discordRoleToFlags(row);
  const permissions = new Set<Permission>();

  if (flags.canUpload) permissions.add(Permission.UPLOAD);
  if (flags.canControlServers) permissions.add(Permission.CONTROL_SERVERS);
  if (flags.canControlMain) permissions.add(Permission.CONTROL_MAIN);
  if (flags.canControlGames) permissions.add(Permission.CONTROL_GAMES);
  if (flags.canControlFunOps) permissions.add(Permission.CONTROL_FUN_OPS);
  if (flags.canControlOther) permissions.add(Permission.CONTROL_OTHER);
  if (flags.canDeleteServers) permissions.add(Permission.DELETE_SERVERS);
  if (flags.canManageMods) permissions.add(Permission.MANAGE_MODS);
  if (flags.canDeleteMissions) permissions.add(Permission.DELETE_MISSIONS);
  if (flags.canViewConsole) permissions.add(Permission.VIEW_CONSOLE);
  if (flags.srAdmin) permissions.add(Permission.SR_ADMIN);
  if (flags.srSquadLeader) permissions.add(Permission.SR_SQUAD_LEADER);
  if (flags.srTrainer) permissions.add(Permission.SR_TRAINER);
  if (flags.srRecruiter) permissions.add(Permission.SR_RECRUITER);
  if (flags.srZeus) {
    permissions.add(Permission.SR_ZEUS);
    permissions.add(Permission.MANAGE_OPS);
  }

  if (flags.canManageServer) {
    permissions.add(Permission.MANAGE_SERVER);
    permissions.add(Permission.ACCESS_ADMIN);
    permissions.add(Permission.ACCESS_DASHBOARD);
    permissions.add(Permission.EDIT_SERVICE_RECORDS);
    permissions.add(Permission.MANAGE_OPS);
  }

  const hasPanelAccess =
    flags.canManageServer ||
    flags.canUpload ||
    flags.canControlServers ||
    flags.canControlMain ||
    flags.canControlGames ||
    flags.canControlFunOps ||
    flags.canControlOther ||
    flags.canManageMods ||
    flags.srAdmin ||
    flags.srSquadLeader ||
    flags.srTrainer ||
    flags.srRecruiter ||
    flags.srZeus;

  if (hasPanelAccess) {
    permissions.add(Permission.ACCESS_DASHBOARD);
  }

  if (
    flags.srAdmin ||
    flags.srSquadLeader ||
    flags.srTrainer ||
    flags.srRecruiter ||
    flags.srZeus
  ) {
    permissions.add(Permission.VIEW_SERVICE_RECORDS);
    permissions.add(Permission.EDIT_SERVICE_RECORDS);
  }

  if (
    flags.canManageServer ||
    flags.srAdmin ||
    flags.srTrainer ||
    flags.srSquadLeader
  ) {
    permissions.add(Permission.ACCESS_ADMIN);
  }

  return permissions;
}

export function hasAnyPanelAccess(flags: DiscordPermissionFlags): boolean {
  return (
    flags.canManageServer ||
    flags.canUpload ||
    flags.canControlServers ||
    flags.canControlMain ||
    flags.canControlGames ||
    flags.canControlFunOps ||
    flags.canControlOther ||
    flags.canManageMods ||
    flags.srAdmin ||
    flags.srSquadLeader ||
    flags.srTrainer ||
    flags.srRecruiter ||
    flags.srZeus
  );
}
