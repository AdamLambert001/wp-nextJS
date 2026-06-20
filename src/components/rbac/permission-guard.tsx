"use client";

import type { ReactNode } from "react";
import { hasPermission } from "@/lib/rbac/access";
import type { Permission } from "@/lib/rbac/permissions";
import type { SerializedAccessContext } from "@/lib/rbac/types";

type PermissionGuardProps = {
  access: SerializedAccessContext;
  permission: Permission;
  permissions?: readonly Permission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
};

export function PermissionGuard({
  access,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const permissionSet = new Set(access.permissions);
  const checks = permissions?.length ? permissions : [permission];

  const allowed = requireAll
    ? checks.every((item) => hasPermission(permissionSet, item))
    : checks.some((item) => hasPermission(permissionSet, item));

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
