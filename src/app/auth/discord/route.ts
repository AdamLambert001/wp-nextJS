import { NextResponse } from "next/server";
import { proxyAuthRequest } from "@/lib/auth-handler";

function forwardSetCookies(target: NextResponse, source: Response) {
  if (typeof source.headers.getSetCookie === "function") {
    for (const cookie of source.headers.getSetCookie()) {
      target.headers.append("Set-Cookie", cookie);
    }
    return;
  }

  const setCookie = source.headers.get("set-cookie");
  if (setCookie) {
    target.headers.append("Set-Cookie", setCookie);
  }
}

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

  const authResponse = await proxyAuthRequest(apiRequest, "/api/auth/sign-in/social");
  const data = (await authResponse.json().catch(() => null)) as {
    url?: string;
    message?: string;
  } | null;

  if (!authResponse.ok || !data?.url) {
    return NextResponse.json(
      { ok: false, message: data?.message ?? "Failed to start Discord sign-in" },
      { status: authResponse.ok ? 500 : authResponse.status },
    );
  }

  const redirect = NextResponse.redirect(data.url);
  forwardSetCookies(redirect, authResponse);
  return redirect;
}
