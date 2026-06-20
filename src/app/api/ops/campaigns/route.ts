import { NextResponse } from "next/server";
import { isManageOpsError, requireManageOps } from "@/lib/ops/api-auth";
import { tryCreateCampaign } from "@/lib/ops/store";

export async function POST(request: Request) {
  const access = await requireManageOps(request.headers);
  if (isManageOpsError(access)) return access;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const result = await tryCreateCampaign(body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, campaign: result.campaign });
}
