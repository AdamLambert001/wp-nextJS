import { getAccessFromHeaders } from "@/lib/rbac/get-access";
import { serializeAccessContext } from "@/lib/rbac/types";

export async function GET(request: Request) {
  const access = await getAccessFromHeaders(request.headers);
  return Response.json(serializeAccessContext(access));
}
