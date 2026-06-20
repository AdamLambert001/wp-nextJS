import { normalizeHomePageContent } from "@/lib/home/normalize";
import type { HomePageContent } from "@/lib/home/types";
import { prisma } from "@/lib/prisma";

export async function loadHomePageContent(): Promise<HomePageContent> {
  try {
    const row = await prisma.homeConfig.findUnique({ where: { id: 1 } });
    if (!row?.payload) {
      return normalizeHomePageContent(null);
    }

    return normalizeHomePageContent(row.payload);
  } catch {
    return normalizeHomePageContent(null);
  }
}
