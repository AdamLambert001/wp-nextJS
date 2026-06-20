import { NextResponse } from "next/server";
import { isManageOpsError, requireManageOps } from "@/lib/ops/api-auth";
import { tryDeleteCampaign, tryUpdateCampaign } from "@/lib/ops/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const access = await requireManageOps(request.headers);
  if (isManageOpsError(access)) return access;

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const result = await tryUpdateCampaign(id, body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, campaign: result.campaign });
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireManageOps(request.headers);
  if (isManageOpsError(access)) return access;

  const { id } = await context.params;
  const result = await tryDeleteCampaign(id);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}
