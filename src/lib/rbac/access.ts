import { Permission } from "@/lib/rbac/permissions";
import { AppRole } from "@/lib/rbac/roles";

export function hasPermission(
  permissions: ReadonlySet<Permission>,
  permission: Permission,
): boolean {
  if (permissions.has(Permission.MANAGE_SERVER)) {
    return true;
  }

  return permissions.has(permission);
}

export function hasAnyPermission(
  permissions: ReadonlySet<Permission>,
  required: readonly Permission[],
): boolean {
  if (permissions.has(Permission.MANAGE_SERVER)) {
    return true;
  }

  return required.some((permission) => permissions.has(permission));
}

export function hasAllPermissions(
  permissions: ReadonlySet<Permission>,
  required: readonly Permission[],
): boolean {
  if (permissions.has(Permission.MANAGE_SERVER)) {
    return true;
  }

  return required.every((permission) => permissions.has(permission));
}

export function hasRole(role: AppRole, allowed: readonly AppRole[]): boolean {
  return allowed.includes(role);
}

export function assertPermission(
  permissions: ReadonlySet<Permission>,
  permission: Permission,
  message = "Forbidden",
): void {
  if (!hasPermission(permissions, permission)) {
    throw new Error(message);
  }
}
