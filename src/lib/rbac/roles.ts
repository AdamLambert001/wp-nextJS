import { Permission } from "@/lib/rbac/permissions";

export enum AppRole {
  GUEST = "guest",
  MEMBER = "member",
  OPERATOR = "operator",
  SR_STAFF = "sr_staff",
  PANEL_ADMIN = "panel_admin",
}

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  [AppRole.GUEST]: [],
  [AppRole.MEMBER]: [Permission.VIEW_SERVICE_RECORDS],
  [AppRole.OPERATOR]: [
    Permission.UPLOAD,
    Permission.CONTROL_SERVERS,
    Permission.CONTROL_MAIN,
    Permission.CONTROL_GAMES,
    Permission.CONTROL_FUN_OPS,
    Permission.CONTROL_OTHER,
    Permission.VIEW_CONSOLE,
    Permission.ACCESS_DASHBOARD,
    Permission.MANAGE_MODS,
    Permission.DELETE_MISSIONS,
    Permission.DELETE_SERVERS,
  ],
  [AppRole.SR_STAFF]: [
    Permission.VIEW_SERVICE_RECORDS,
    Permission.EDIT_SERVICE_RECORDS,
    Permission.SR_ADMIN,
    Permission.SR_SQUAD_LEADER,
    Permission.SR_TRAINER,
    Permission.SR_RECRUITER,
    Permission.SR_ZEUS,
  ],
  [AppRole.PANEL_ADMIN]: [...Object.values(Permission)],
};

export function resolveAppRole(permissions: ReadonlySet<Permission>): AppRole {
  if (permissions.has(Permission.MANAGE_SERVER) || permissions.has(Permission.ACCESS_ADMIN)) {
    return AppRole.PANEL_ADMIN;
  }

  const hasSr =
    permissions.has(Permission.SR_ADMIN) ||
    permissions.has(Permission.SR_SQUAD_LEADER) ||
    permissions.has(Permission.SR_TRAINER) ||
    permissions.has(Permission.SR_RECRUITER) ||
    permissions.has(Permission.SR_ZEUS) ||
    permissions.has(Permission.EDIT_SERVICE_RECORDS);

  if (hasSr) {
    return AppRole.SR_STAFF;
  }

  const hasOperator =
    permissions.has(Permission.CONTROL_SERVERS) ||
    permissions.has(Permission.UPLOAD) ||
    permissions.has(Permission.ACCESS_DASHBOARD) ||
    permissions.has(Permission.MANAGE_MODS);

  if (hasOperator) {
    return AppRole.OPERATOR;
  }

  if (permissions.has(Permission.VIEW_SERVICE_RECORDS)) {
    return AppRole.MEMBER;
  }

  return AppRole.GUEST;
}
