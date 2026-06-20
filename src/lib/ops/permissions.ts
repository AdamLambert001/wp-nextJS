import type { DiscordPermissionFlags } from "@/lib/rbac/discord-role-mapper";
import { hasPermission } from "@/lib/rbac/access";
import { Permission } from "@/lib/rbac/permissions";
import type { AccessContext } from "@/lib/rbac/types";
import type { OpsCapabilities } from "@/lib/ops/types";

export function canManageOps(flags: DiscordPermissionFlags): boolean {
  return flags.canManageServer || flags.srZeus;
}

export function canManageOpsAccess(access: AccessContext): boolean {
  return hasPermission(access.permissions, Permission.MANAGE_OPS);
}

export function getOpsCapabilities(
  flags: DiscordPermissionFlags,
  authenticated: boolean,
): OpsCapabilities {
  return {
    authenticated,
    canManageOps: canManageOps(flags),
  };
}
