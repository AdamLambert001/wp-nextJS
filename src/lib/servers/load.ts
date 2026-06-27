import { prisma } from "@/lib/prisma";
import { queryServerStatus } from "@/lib/servers/status";
import type { PublicGameServer, ServerCardData } from "@/lib/servers/types";

export async function loadPublicGameServers(): Promise<PublicGameServer[]> {
  const rows = await prisma.gameServer.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      address: true,
      port: true,
      category: true,
      description: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    port: row.port,
    category: row.category || "Other",
    description: row.description,
  }));
}

export async function loadServerCards(): Promise<ServerCardData[]> {
  const servers = await loadPublicGameServers();
  const statuses = await Promise.all(servers.map((server) => queryServerStatus(server)));

  return servers.map((server, index) => ({
    ...server,
    status: statuses[index],
  }));
}
