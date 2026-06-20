import { mapLastOperationAttendedByIds } from "@/lib/admin/service-record-detail";
import { resolveProfileAvatarUrl } from "@/lib/profile/avatar";
import {
  discordFlagsToPanelRoles,
  isDiscordSnowflake,
  panelRolesToDiscordFields,
  type PanelRole,
} from "@/lib/rbac/panel-roles";
import { discordRoleToFlags } from "@/lib/rbac/discord-role-mapper";
import { prisma } from "@/lib/prisma";

export type ServiceRecordRow = {
  id: string;
  displayName: string;
  avatarUrl: string;
  rank: string | null;
  assignment: string | null;
  unit: string | null;
  lastOperationAttended: string | null;
  lastOperationAttendedAt: string | null;
  discordId: string | null;
  discordLinked: boolean;
  panelRoles: PanelRole[];
  discordName: string | null;
};

function resolveDisplayName(record: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  id: string;
}) {
  if (record.displayName?.trim()) {
    return record.displayName.trim();
  }

  const fullName = [record.firstName, record.lastName]
    .filter((part) => part?.trim())
    .join(" ")
    .trim();

  return fullName || record.id;
}

export async function loadServiceRecordRows(): Promise<ServiceRecordRow[]> {
  const [records, discordRoles] = await Promise.all([
    prisma.serviceRecord.findMany({
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        rank: true,
        assignment: true,
        unit: true,
        avatarUrl: true,
      },
    }),
    prisma.discordRole.findMany(),
  ]);

  const discordById = new Map(discordRoles.map((role) => [role.discordId, role]));
  const lastOpById = await mapLastOperationAttendedByIds(records.map((record) => record.id));

  return Promise.all(
    records.map(async (record) => {
      const discordId = isDiscordSnowflake(record.id) ? record.id : null;
      const discordRole = discordId ? discordById.get(discordId) ?? null : null;
      const flags = discordRoleToFlags(discordRole);
      const lastOp = lastOpById.get(record.id);

      return {
        id: record.id,
        displayName: resolveDisplayName(record),
        avatarUrl: await resolveProfileAvatarUrl({
          id: record.id,
          avatarUrl: record.avatarUrl,
        }),
        rank: record.rank,
        assignment: record.assignment,
        unit: record.unit,
        lastOperationAttended: lastOp?.label ?? null,
        lastOperationAttendedAt: lastOp?.sortValue ?? null,
        discordId,
        discordLinked: Boolean(discordId),
        panelRoles: discordFlagsToPanelRoles(flags),
        discordName: discordRole?.discordName ?? null,
      };
    }),
  );
}

export async function upsertDiscordPanelRoles(input: {
  discordId: string;
  discordName?: string | null;
  roles: PanelRole[];
}) {
  const discordId = input.discordId.trim();
  if (!isDiscordSnowflake(discordId)) {
    throw new Error("INVALID_DISCORD_ID");
  }

  const roleFields = panelRolesToDiscordFields(input.roles);
  const existing = await prisma.discordRole.findUnique({ where: { discordId } });

  if (existing) {
    return prisma.discordRole.update({
      where: { discordId },
      data: {
        ...roleFields,
        discordName: input.discordName?.trim() || existing.discordName,
      },
    });
  }

  return prisma.discordRole.create({
    data: {
      discordId,
      discordName: input.discordName?.trim() || null,
      ...roleFields,
    },
  });
}
