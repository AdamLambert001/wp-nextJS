import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

function normalizeOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/\/$/, "");
}

const authBaseUrl =
  normalizeOrigin(process.env.BETTER_AUTH_URL) ??
  normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL) ??
  "http://localhost:3000";

const trustedOrigins = [
  normalizeOrigin(process.env.BETTER_AUTH_URL),
  normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL),
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
].filter((value): value is string => Boolean(value));

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authBaseUrl,
  trustedOrigins: trustedOrigins.length > 0 ? trustedOrigins : [authBaseUrl],
  user: {
    modelName: "authUser",
  },
  session: {
    modelName: "authSession",
    // Database-backed sessions in `ba_session` (not JWT bearer tokens).
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: false,
    },
  },
  account: {
    modelName: "authAccount",
  },
  verification: {
    modelName: "authVerification",
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      redirectURI: process.env.DISCORD_REDIRECT_URI,
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
