import { prisma } from "@/lib/prisma";
import { isDiscordSnowflake } from "@/lib/rbac/panel-roles";

/**
 * Better Auth stores the Discord snowflake on `AuthAccount.accountId`, not `AuthUser.id`.
 * Legacy `discord_roles.discord_id` keys off the Discord snowflake.
 */
export async function resolveDiscordIdForUser(userId: string): Promise<string | null> {
  if (isDiscordSnowflake(userId)) {
    return userId;
  }

  const account = await prisma.authAccount.findFirst({
    where: {
      userId,
      providerId: "discord",
    },
    select: { accountId: true },
  });

  if (account?.accountId && isDiscordSnowflake(account.accountId)) {
    return account.accountId;
  }

  return null;
}
