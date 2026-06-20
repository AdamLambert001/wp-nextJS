import { NextResponse } from "next/server";
import { loadProfileLogs } from "@/lib/profile/load";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const category = new URL(request.url).searchParams.get("category") ?? undefined;

  try {
    const logs = await loadProfileLogs(id, category);
    if (logs === null) {
      return NextResponse.json({ ok: false, message: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CATEGORY") {
      return NextResponse.json({ ok: false, message: "Invalid category filter" }, { status: 400 });
    }

    console.error("Failed to load profile logs", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch profile logs" },
      { status: 500 },
    );
  }
}
