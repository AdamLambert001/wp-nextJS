import type { NavItem } from "@/lib/rbac/types";
import { Permission } from "@/lib/rbac/permissions";

export const siteConfig = {
  siteTitle: "Zeta Company",
  documentTitle: "Zeta Company — Arma 3 Unit",
  tagline:
    "ODST unit for Arma 3 Halosim — weekly operations, in-depth campaigns, and a friendly Optre community.",
  loginIntro: "Sign in with Discord to access unit operations and personnel records.",
  logoSrc: "/zeta-logo.png",
  logoAlt: "Zeta Company",
} as const;

export const headerNav: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "ORBAT", href: "/orbat" },
  { label: "Profiles", href: "/profile" },
  {
    label: "Unit Info",
    children: [
      {
        label: "Ranks",
        href: "/ranks",
        description: "Rank structure, cooldowns, and progression.",
      },
      {
        label: "Radios",
        href: "/radios",
        description: "Short-range and long-range radio net reference.",
      },
      {
        label: "Lore",
        href: "/lore",
        description: "Background, assets, and campaign intel.",
      },
      {
        label: "Admin Departments",
        href: "/admin-departments",
        description: "Unit admin positions and assignments.",
      },
    ],
  },
  { label: "Operations", href: "/ops" },
  {
    label: "Admin",
    href: "/admin",
    permissions: [Permission.ACCESS_ADMIN],
  },
];

export type PanelSection = NavItem & {
  title: string;
  description: string;
  status: "coming-soon" | "available";
  href: string;
};

export const navSections: readonly PanelSection[] = [
  {
    label: "Operations",
    title: "Operations",
    description: "Campaigns, mission briefs, and attendance.",
    href: "/ops",
    status: "available",
  },
  {
    label: "ORBAT",
    title: "ORBAT",
    description: "Unit structure, billets, and assignments.",
    href: "/orbat",
    status: "available",
  },
  {
    label: "Service Records",
    title: "Service Records",
    description: "Personnel profiles, ranks, and awards.",
    href: "/profile",
    status: "available",
  },
  {
    label: "Unit Lore",
    title: "Unit Lore",
    description: "Background, assets, and campaign intel.",
    href: "/lore",
    status: "available",
  },
  {
    label: "Ranks",
    title: "Ranks",
    description: "Rank structure, cooldowns, and progression.",
    href: "/ranks",
    status: "available",
  },
  {
    label: "Radios",
    title: "Radios",
    description: "Short-range and long-range radio net reference.",
    href: "/radios",
    status: "available",
  },
  {
    label: "Admin Departments",
    title: "Admin Departments",
    description: "Unit admin positions and assignments.",
    href: "/admin-departments",
    status: "available",
  },
  {
    label: "Mods",
    title: "Mods",
    description: "Workshop staging and server mod lists.",
    href: "/mods",
    status: "coming-soon",
    permissions: [Permission.MANAGE_MODS, Permission.ACCESS_DASHBOARD],
  },
  {
    label: "Server Control",
    title: "Server Control",
    description: "Start, stop, and monitor dedicated servers.",
    href: "/dashboard",
    status: "coming-soon",
    permissions: [Permission.ACCESS_DASHBOARD],
  },
  {
    label: "Admin",
    title: "Admin",
    description: "Panel settings, permissions, and site configuration.",
    href: "/admin",
    status: "available",
    permissions: [Permission.ACCESS_ADMIN],
  },
];
