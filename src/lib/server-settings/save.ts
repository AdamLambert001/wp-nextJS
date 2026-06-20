import { prisma } from "@/lib/prisma";
import { isValidHexColor } from "@/lib/theme-colors";
import { loadServerSettingsFromDb } from "@/lib/server-settings/load";

function normalizeHex(input: string): string {
  const trimmed = input.trim();
  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!isValidHexColor(hex)) {
    throw new Error("Secondary colour must be a valid 6-digit hex value.");
  }
  return hex.toLowerCase();
}

export async function saveServerSecondaryColor(hex: string) {
  const normalized = normalizeHex(hex);

  await prisma.serverSetting.upsert({
    where: { id: 1 },
    create: { id: 1, secondaryColor: normalized },
    update: { secondaryColor: normalized },
  });

  return loadServerSettingsFromDb();
}
