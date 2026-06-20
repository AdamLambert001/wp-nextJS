import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export async function proxyAuthRequest(
  request: Request,
  authPath: string,
): Promise<Response> {
  const incoming = new URL(request.url);
  const target = new URL(authPath, incoming.origin);
  target.search = incoming.search;

  const init: RequestInit = {
    method: request.method,
    headers: request.headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const proxied = new Request(target.toString(), init);
  const method = request.method.toUpperCase();

  switch (method) {
    case "POST":
      return handlers.POST(proxied);
    case "PATCH":
      return handlers.PATCH(proxied);
    case "PUT":
      return handlers.PUT(proxied);
    case "DELETE":
      return handlers.DELETE(proxied);
    default:
      return handlers.GET(proxied);
  }
}
