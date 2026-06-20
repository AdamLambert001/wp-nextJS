import { proxyAuthRequest } from "@/lib/auth-handler";

export async function GET(request: Request) {
  return proxyAuthRequest(request, "/api/auth/callback/discord");
}

export async function POST(request: Request) {
  return proxyAuthRequest(request, "/api/auth/callback/discord");
}
