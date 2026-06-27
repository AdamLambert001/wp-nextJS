import type { Metadata } from "next";
import { ServersBoard } from "@/components/servers/servers-board";
import { Badge } from "@/components/ui/badge";
import { hasAnyPermission } from "@/lib/rbac/access";
import { getAccess } from "@/lib/rbac/get-access";
import { Permission } from "@/lib/rbac/permissions";
import { loadServerCards } from "@/lib/servers/load";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Servers — Zeta Company",
};

export default async function ServersPage() {
  const [servers, access] = await Promise.all([loadServerCards(), getAccess()]);
  const canAddServers = hasAnyPermission(access.permissions, [
    Permission.CONTROL_SERVERS,
    Permission.MANAGE_SERVER,
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="space-y-2">
        <Badge variant="secondary">Live GameDig status</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Servers</h1>
      </div>

      <ServersBoard initialServers={servers} canAddServers={canAddServers} />
    </main>
  );
}
