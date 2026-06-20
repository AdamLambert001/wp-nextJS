import { RouteGuard } from "@/components/rbac/route-guard";
import { Permission } from "@/lib/rbac/permissions";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard permissions={[Permission.ACCESS_ADMIN]}>
      {children}
    </RouteGuard>
  );
}
