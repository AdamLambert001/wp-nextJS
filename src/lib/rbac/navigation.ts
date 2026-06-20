import { hasAnyPermission, hasPermission } from "@/lib/rbac/access";
import type { NavItem } from "@/lib/rbac/types";
import type { Permission } from "@/lib/rbac/permissions";
import { AppRole } from "@/lib/rbac/roles";

function isNavEntryVisible(
  item: { permissions?: readonly Permission[]; roles?: readonly AppRole[] },
  permissions: ReadonlySet<Permission>,
  role: AppRole,
): boolean {
  if (item.roles?.length) {
    if (!item.roles.includes(role) && role !== AppRole.PANEL_ADMIN) {
      return false;
    }
  }

  if (!item.permissions?.length) {
    return true;
  }

  return hasAnyPermission(permissions, item.permissions);
}

export function filterNavigation<T extends NavItem>(
  items: readonly T[],
  permissions: ReadonlySet<Permission>,
  role: AppRole,
): T[] {
  return items.flatMap((item) => {
    if (!isNavEntryVisible(item, permissions, role)) {
      return [];
    }

    if (!item.children?.length) {
      return [item];
    }

    const visibleChildren = item.children.filter((child) =>
      isNavEntryVisible(child, permissions, role),
    );

    if (visibleChildren.length === 0) {
      return [];
    }

    return [{ ...item, children: visibleChildren } as T];
  });
}

export function canAccessRoute(
  permissions: ReadonlySet<Permission>,
  required: readonly Permission[] | undefined,
): boolean {
  if (!required?.length) {
    return true;
  }

  return hasAnyPermission(permissions, required);
}

export function canPerformAction(
  permissions: ReadonlySet<Permission>,
  permission: Permission,
): boolean {
  return hasPermission(permissions, permission);
}
