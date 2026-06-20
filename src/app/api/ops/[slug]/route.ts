import { NextResponse } from "next/server";
import { isManageOpsError, requireManageOps } from "@/lib/ops/api-auth";
import { getEnrichedOpByFriendlyName, tryUpdateOperation } from "@/lib/ops/store";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  try {
    const operation = await getEnrichedOpByFriendlyName(slug);
    if (!operation) {
      return NextResponse.json(
        { ok: false, message: "Operation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { ok: true, operation },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to load operation", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch operation." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const access = await requireManageOps(request.headers);
  if (isManageOpsError(access)) return access;

  const { slug } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const result = await tryUpdateOperation(slug, body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, operation: result.operation });
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireManageOps(request.headers);
  if (isManageOpsError(access)) return access;

  const { slug } = await context.params;
  const { tryDeleteOperation } = await import("@/lib/ops/store");
  const result = await tryDeleteOperation(slug);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
