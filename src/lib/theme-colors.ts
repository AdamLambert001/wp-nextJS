const DEFAULT_SECONDARY_HEX = "#dc2626";

type Rgb = { r: number; g: number; b: number };

function parseHexColor(input: string): Rgb | null {
  const hex = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  const value = Number.parseInt(hex, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

export function isValidHexColor(input: string): boolean {
  const raw = input.trim();
  if (!raw) {
    return false;
  }
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;
  return /^[0-9a-fA-F]{6}$/.test(hex);
}

function srgbToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function rgbToOklch({ r, g, b }: Rgb): string {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const lightness =
    0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a =
    1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const bVal =
    0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;

  const chroma = Math.sqrt(a * a + bVal * bVal);
  let hue = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (hue < 0) {
    hue += 360;
  }

  return `oklch(${lightness.toFixed(4)} ${chroma.toFixed(4)} ${hue.toFixed(2)})`;
}

export function resolveThemeColor(input: string | undefined): string {
  const raw = input?.trim();
  if (!raw) {
    return rgbToOklch(parseHexColor(DEFAULT_SECONDARY_HEX)!);
  }

  if (raw.startsWith("oklch(")) {
    return raw;
  }

  if (raw.startsWith("#")) {
    const rgb = parseHexColor(raw);
    if (rgb) {
      return rgbToOklch(rgb);
    }
  }

  return rgbToOklch(parseHexColor(DEFAULT_SECONDARY_HEX)!);
}

export function contrastingForeground(oklchColor: string): string {
  const match = oklchColor.match(/oklch\(([\d.]+)/);
  const lightness = match ? Number.parseFloat(match[1]) : 0.5;
  return lightness > 0.62 ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)";
}

export function getThemeSecondaryColor(hexOverride?: string | null): string {
  const raw = hexOverride?.trim();
  if (raw && isValidHexColor(raw)) {
    return resolveThemeColor(raw);
  }
  return resolveThemeColor(process.env.THEME_SECONDARY_COLOR);
}

export function applyThemeSecondaryToElement(element: HTMLElement, secondaryHex: string) {
  const secondary = getThemeSecondaryColor(secondaryHex);
  const secondaryForeground = getThemeSecondaryForeground(secondary);

  element.style.setProperty("--theme-secondary", secondary);
  element.style.setProperty("--theme-secondary-foreground", secondaryForeground);
  element.style.setProperty("--secondary", "var(--theme-secondary)");
  element.style.setProperty("--secondary-foreground", "var(--theme-secondary-foreground)");
  element.style.setProperty(
    "--accent",
    "color-mix(in oklch, var(--theme-secondary) 18%, transparent)",
  );
  element.style.setProperty("--accent-foreground", "var(--theme-secondary-foreground)");
  element.style.setProperty("--sidebar-primary", "var(--theme-secondary)");
  element.style.setProperty(
    "--sidebar-primary-foreground",
    "var(--theme-secondary-foreground)",
  );
  element.style.setProperty(
    "--ring",
    "color-mix(in oklch, var(--theme-secondary) 45%, var(--foreground))",
  );
}

export function clearThemeSecondaryFromElement(element: HTMLElement) {
  const properties = [
    "--theme-secondary",
    "--theme-secondary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--accent",
    "--accent-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--ring",
  ] as const;

  for (const property of properties) {
    element.style.removeProperty(property);
  }
}

export function getThemeSecondaryForeground(secondary = getThemeSecondaryColor()): string {
  return contrastingForeground(secondary);
}

export const themeColorEnvKey = "THEME_SECONDARY_COLOR" as const;
export const defaultThemeSecondaryHex = DEFAULT_SECONDARY_HEX;
