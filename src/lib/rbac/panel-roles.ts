import type { DiscordPermissionFlags } from "@/lib/rbac/discord-role-mapper";

export const PanelRole = {
  ADMIN: "admin",
  TEAM_LEAD: "team_lead",
  SQUAD_LEAD: "squad_lead",
  ORBAT_ADMIN: "orbat_admin",
  OPS_ADMIN: "ops_admin",
} as const;

export type PanelRole = (typeof PanelRole)[keyof typeof PanelRole];

export const PANEL_ROLE_OPTIONS: readonly {
  id: PanelRole;
  label: string;
  description: string;
}[] = [
  {
    id: PanelRole.ADMIN,
    label: "Admin",
    description: "Full panel admin (server management + service records).",
  },
  {
    id: PanelRole.TEAM_LEAD,
    label: "Team Lead",
    description: "Trainer / team lead service records access.",
  },
  {
    id: PanelRole.SQUAD_LEAD,
    label: "Squad Lead",
    description: "Squad-level edits and ORBAT position assignment.",
  },
  {
    id: PanelRole.ORBAT_ADMIN,
    label: "ORBAT Admin",
    description:
      "Service records, ORBAT structure, ranks, radios, and admin departments.",
  },
  {
    id: PanelRole.OPS_ADMIN,
    label: "Ops Admin",
    description: "Create and manage campaigns, operations, and unit lore.",
  },
] as const;

const PANEL_ROLE_SET = new Set<string>(Object.values(PanelRole));

export function isPanelRole(value: string): value is PanelRole {
  return PANEL_ROLE_SET.has(value);
}

export function parsePanelRoles(values: unknown): PanelRole[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter((value): value is PanelRole => typeof value === "string" && isPanelRole(value));
}

export function discordFlagsToPanelRoles(flags: DiscordPermissionFlags): PanelRole[] {
  const roles: PanelRole[] = [];

  if (flags.canManageServer) {
    roles.push(PanelRole.ADMIN);
  } else if (flags.srAdmin) {
    roles.push(PanelRole.ORBAT_ADMIN);
  }

  if (flags.srTrainer) {
    roles.push(PanelRole.TEAM_LEAD);
  }

  if (flags.srSquadLeader) {
    roles.push(PanelRole.SQUAD_LEAD);
  }

  if (flags.srZeus) {
    roles.push(PanelRole.OPS_ADMIN);
  }

  return roles;
}

export function panelRolesToDiscordFields(roles: readonly PanelRole[]) {
  const roleSet = new Set(roles);

  return {
    srAdmin: roleSet.has(PanelRole.ADMIN) || roleSet.has(PanelRole.ORBAT_ADMIN),
    canManageServer: roleSet.has(PanelRole.ADMIN),
    srTrainer: roleSet.has(PanelRole.TEAM_LEAD),
    srSquadLeader: roleSet.has(PanelRole.SQUAD_LEAD),
    srZeus: roleSet.has(PanelRole.OPS_ADMIN),
  };
}

export function formatPanelRoles(roles: readonly PanelRole[]): string {
  if (!roles.length) {
    return "No roles";
  }

  const labels = new Map(PANEL_ROLE_OPTIONS.map((option) => [option.id, option.label]));
  return roles.map((role) => labels.get(role) ?? role).join(", ");
}

export function isDiscordSnowflake(value: string): boolean {
  return /^\d{10,25}$/.test(value.trim());
}
