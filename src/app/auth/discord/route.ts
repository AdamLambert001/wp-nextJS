import { proxyAuthRequest } from "@/lib/auth-handler";

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const callbackURL = incoming.searchParams.get("callbackURL") ?? "/";

  const apiRequest = new Request(
    new URL("/api/auth/sign-in/social", incoming.origin),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: "discord",
        callbackURL,
      }),
    },
  );

  return proxyAuthRequest(apiRequest, "/api/auth/sign-in/social");
}
