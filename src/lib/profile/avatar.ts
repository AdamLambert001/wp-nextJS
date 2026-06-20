import { isDiscordSnowflake } from "@/lib/rbac/panel-roles";

function defaultDiscordAvatarUrl(discordId: string): string {
  try {
    const value = BigInt(String(discordId));
    const index = Number((value >> BigInt(22)) % BigInt(6));
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  } catch {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

export async function fetchDiscordAvatarUrl(discordId: string): Promise<string> {
  const token = String(process.env.DISCORD_BOT_TOKEN ?? "").trim();
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is not configured");
  }
  if (!isDiscordSnowflake(discordId)) {
    throw new Error("ID must be a Discord numeric ID");
  }

  const apiBase = String(process.env.DISCORD_API_BASE ?? "https://discord.com/api/v10").replace(
    /\/+$/,
    "",
  );
  const response = await fetch(`${apiBase}/users/${encodeURIComponent(discordId)}`, {
    headers: {
      Authorization: `Bot ${token}`,
    },
    next: { revalidate: 3600 },
  });

  if (response.status === 404) {
    throw new Error("Discord user not found");
  }
  if (!response.ok) {
    throw new Error(`Discord API error (${response.status})`);
  }

  const user = (await response.json()) as { avatar?: string | null };
  if (user?.avatar) {
    const ext = String(user.avatar).startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.${ext}?size=256`;
  }

  return defaultDiscordAvatarUrl(discordId);
}

export async function resolveProfileAvatarUrl(input: {
  id: string;
  avatarUrl?: string | null;
}): Promise<string> {
  const stored = String(input.avatarUrl ?? "").trim();
  if (stored) return stored;

  if (!isDiscordSnowflake(input.id)) {
    return "/favicon.ico";
  }

  try {
    return await fetchDiscordAvatarUrl(input.id);
  } catch {
    return defaultDiscordAvatarUrl(input.id);
  }
}
