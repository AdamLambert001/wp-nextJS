import { NextResponse } from "next/server";
import { loadPublicProfilesList } from "@/lib/profile/load";

export async function GET() {
  try {
    const rows = await loadPublicProfilesList();
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error("Failed to load public profiles", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch profiles" },
      { status: 500 },
    );
  }
}
