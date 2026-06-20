import type { DiscordRole } from "@/generated/prisma/client";
import type { Permission } from "@/lib/rbac/permissions";
import type { AppRole } from "@/lib/rbac/roles";
import type { DiscordPermissionFlags } from "@/lib/rbac/discord-role-mapper";

export type NavDropdownItem = {
  label: string;
  href: string;
  description?: string;
  permissions?: readonly Permission[];
  roles?: readonly AppRole[];
};

export type NavItem = {
  label: string;
  href?: string;
  description?: string;
  children?: readonly NavDropdownItem[];
  permissions?: readonly Permission[];
  roles?: readonly AppRole[];
};

export type AccessContext = {
  authenticated: boolean;
  userId: string | null;
  discordId: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  role: AppRole;
  permissions: ReadonlySet<Permission>;
  discordRole: DiscordRole | null;
  flags: DiscordPermissionFlags;
};

export type SerializedAccessContext = {
  authenticated: boolean;
  userId: string | null;
  discordId: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  role: AppRole;
  permissions: Permission[];
  flags: DiscordPermissionFlags;
};

export function serializeAccessContext(access: AccessContext): SerializedAccessContext {
  return {
    authenticated: access.authenticated,
    userId: access.userId,
    discordId: access.discordId,
    name: access.name,
    email: access.email,
    image: access.image,
    role: access.role,
    permissions: [...access.permissions],
    flags: access.flags,
  };
}
