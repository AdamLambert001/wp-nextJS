import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { PublicGameServer } from "@/lib/servers/types";
import type { ServerFormInput } from "@/lib/servers/validation";

export async function createGameServer(input: ServerFormInput): Promise<PublicGameServer> {
  const lastServer = await prisma.gameServer.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const row = await prisma.gameServer.create({
    data: {
      id: randomUUID(),
      name: input.name,
      address: input.address,
      port: input.port,
      category: input.category,
      description: input.description,
      profileId: "",
      sortOrder: (lastServer?.sortOrder ?? 0) + 1,
    },
    select: {
      id: true,
      name: true,
      address: true,
      port: true,
      category: true,
      description: true,
    },
  });

  return row;
}

export async function findPublicGameServer(id: string): Promise<PublicGameServer | null> {
  return prisma.gameServer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      port: true,
      category: true,
      description: true,
    },
  });
}

export async function updateGameServer(
  id: string,
  input: ServerFormInput,
): Promise<PublicGameServer> {
  const row = await prisma.gameServer.update({
    where: { id },
    data: {
      name: input.name,
      address: input.address,
      port: input.port,
      category: input.category,
      description: input.description,
    },
    select: {
      id: true,
      name: true,
      address: true,
      port: true,
      category: true,
      description: true,
    },
  });

  return {
    ...row,
    category: row.category || "Other",
  };
}
