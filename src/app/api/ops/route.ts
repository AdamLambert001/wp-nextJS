import { NextResponse } from "next/server";
import { isManageOpsError, requireManageOps } from "@/lib/ops/api-auth";
import { loadPublicOpsBundle } from "@/lib/ops/load";
import { tryCreateOperation } from "@/lib/ops/store";

export async function GET() {
  try {
    const data = await loadPublicOpsBundle();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to load ops bundle", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch operations data" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const access = await requireManageOps(request.headers);
  if (isManageOpsError(access)) return access;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const result = await tryCreateOperation(body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, operation: result.operation });
}
