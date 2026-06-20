import type { CSSProperties } from "react";
import type { OrbatUserSummary } from "@/lib/orbat/types";

export function resolveOrbatDisplayName(user: {
  id: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const firstName = String(user.firstName ?? "").trim();
  const lastName = String(user.lastName ?? "").trim();
  const nickname = String(user.displayName ?? "").trim();
  const firstInitialSource = firstName || nickname;
  const firstInitial = firstInitialSource
    ? `${firstInitialSource.charAt(0).toUpperCase()}.`
    : "";
  const nicknamePart = nickname ? `"${nickname}"` : "";
  const parts = [firstInitial, nicknamePart, lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);

  if (parts.length) {
    return parts.join(" ");
  }

  return String(user.id ?? "").trim();
}

export function memberSearchHaystack(user: OrbatUserSummary | {
  id: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
}): string {
  return [
    resolveOrbatDisplayName(user),
    user.id,
    user.firstName,
    user.lastName,
    user.displayName,
    "rank" in user ? user.rank : "",
  ]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatLastOp(isoStr: string | null | undefined): string {
  if (!isoStr) return "-";
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function applyGroupGradientStyle(hex: string | undefined): CSSProperties {
  const accent = String(hex ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(accent)) {
    return {
      background: `linear-gradient(90deg, ${accent} 0%, rgba(15,23,42,0.72) 55%, #0b1220 100%)`,
    };
  }
  return {};
}

export function applyGroupBackgroundStyle(imageUrl: string | undefined): CSSProperties {
  const url = String(imageUrl ?? "").trim();
  if (!url) return {};
  return {
    backgroundImage: `url("${url.replace(/"/g, '\\"')}")`,
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}
