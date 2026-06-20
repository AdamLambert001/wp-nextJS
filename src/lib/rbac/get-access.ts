import { cache } from "react";
import { auth } from "@/lib/auth";
import { resolveDiscordIdForUser } from "@/lib/auth/discord-id";
import { getSession } from "@/lib/auth-server";
import { hasAnyPermission } from "@/lib/rbac/access";
import {
  discordRoleToFlags,
  permissionsFromDiscordRole,
} from "@/lib/rbac/discord-role-mapper";
import type { Permission } from "@/lib/rbac/permissions";
import { AppRole, resolveAppRole } from "@/lib/rbac/roles";
import type { AccessContext } from "@/lib/rbac/types";
import { prisma } from "@/lib/prisma";

const GUEST_ACCESS: AccessContext = {
  authenticated: false,
  userId: null,
  discordId: null,
  name: null,
  email: null,
  image: null,
  role: AppRole.GUEST,
  permissions: new Set(),
  discordRole: null,
  flags: discordRoleToFlags(null),
};

async function buildAccessContext(
  session: Awaited<ReturnType<typeof auth.api.getSession>>,
): Promise<AccessContext> {
  const user = session?.user;

  if (!user) {
    return GUEST_ACCESS;
  }

  const discordId = await resolveDiscordIdForUser(user.id);
  const discordRole = discordId
    ? await prisma.discordRole.findUnique({
        where: { discordId },
      })
    : null;

  const permissions = permissionsFromDiscordRole(discordRole);
  const flags = discordRoleToFlags(discordRole);

  return {
    authenticated: true,
    userId: user.id,
    discordId,
    name: user.name,
    email: user.email ?? null,
    image: user.image ?? null,
    role: resolveAppRole(permissions),
    permissions,
    discordRole,
    flags,
  };
}

export const getAccess = cache(async (): Promise<AccessContext> => {
  const session = await getSession();
  return buildAccessContext(session);
});

export async function getAccessFromHeaders(
  headers: Headers,
): Promise<AccessContext> {
  const session = await auth.api.getSession({ headers });
  return buildAccessContext(session);
}

export async function requireAuthenticated(): Promise<AccessContext> {
  const access = await getAccess();

  if (!access.authenticated) {
    throw new Error("UNAUTHENTICATED");
  }

  return access;
}

export async function requireAccess(
  required: readonly Permission[],
): Promise<AccessContext> {
  const access = await getAccess();

  if (!access.authenticated) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!hasAnyPermission(access.permissions, required)) {
    throw new Error("FORBIDDEN");
  }

  return access;
}

export async function requireAuthenticatedFromHeaders(
  headers: Headers,
): Promise<AccessContext> {
  const access = await getAccessFromHeaders(headers);

  if (!access.authenticated) {
    throw new Error("UNAUTHENTICATED");
  }

  return access;
}

export async function requireAccessFromHeaders(
  headers: Headers,
  required: readonly Permission[],
): Promise<AccessContext> {
  const access = await getAccessFromHeaders(headers);

  if (!access.authenticated) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!hasAnyPermission(access.permissions, required)) {
    throw new Error("FORBIDDEN");
  }

  return access;
}
