import { prisma } from "@/lib/prisma";
import {
  defaultThemeSecondaryHex,
  isValidHexColor,
  resolveThemeColor,
} from "@/lib/theme-colors";

export type ServerSettings = {
  secondaryColorHex: string;
};

function resolveSecondaryHex(dbHex: string | null | undefined): string {
  const trimmedDb = dbHex?.trim();
  if (trimmedDb && isValidHexColor(trimmedDb)) {
    return trimmedDb.startsWith("#") ? trimmedDb : `#${trimmedDb}`;
  }

  const envHex = process.env.THEME_SECONDARY_COLOR?.trim();
  if (envHex && isValidHexColor(envHex)) {
    return envHex.startsWith("#") ? envHex : `#${envHex}`;
  }

  return defaultThemeSecondaryHex;
}

export async function loadServerSettingsFromDb(): Promise<ServerSettings> {
  const row = await prisma.serverSetting.findUnique({ where: { id: 1 } });
  return {
    secondaryColorHex: resolveSecondaryHex(row?.secondaryColor),
  };
}

export function getSecondaryOklch(hex: string): string {
  return resolveThemeColor(hex);
}
