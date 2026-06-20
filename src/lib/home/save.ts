import { normalizeHomePageContent } from "@/lib/home/normalize";
import type { HomePageContent } from "@/lib/home/types";
import { prisma } from "@/lib/prisma";

export async function saveHomePageContent(nextRaw: unknown): Promise<HomePageContent> {
  const normalized = normalizeHomePageContent(nextRaw);

  await prisma.homeConfig.upsert({
    where: { id: 1 },
    update: { payload: normalized },
    create: { id: 1, payload: normalized },
  });

  return normalized;
}
