import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAccess } from "@/lib/rbac/get-access";
import { canAccessRoute } from "@/lib/rbac/navigation";
import type { Permission } from "@/lib/rbac/permissions";

type RouteGuardProps = {
  permissions: readonly Permission[];
  children: ReactNode;
  redirectTo?: string;
};

export async function RouteGuard({
  permissions,
  children,
  redirectTo = "/no-access",
}: RouteGuardProps) {
  const access = await getAccess();

  if (!access.authenticated) {
    redirect("/");
  }

  if (!canAccessRoute(access.permissions, permissions)) {
    redirect(redirectTo);
  }

  return <>{children}</>;
}
