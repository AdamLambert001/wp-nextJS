"use client";

import type { ReactNode } from "react";
import { canPerformAction } from "@/lib/rbac/navigation";
import type { Permission } from "@/lib/rbac/permissions";
import type { SerializedAccessContext } from "@/lib/rbac/types";

type ActionGuardProps = {
  access: SerializedAccessContext;
  permission: Permission;
  fallback?: ReactNode;
  children: ReactNode;
};

export function ActionGuard({
  access,
  permission,
  fallback = null,
  children,
}: ActionGuardProps) {
  const allowed = canPerformAction(new Set(access.permissions), permission);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
