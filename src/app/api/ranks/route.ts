import { NextResponse } from "next/server";
import { loadPublicRanksData } from "@/lib/sr-settings/load";

export async function GET() {
  try {
    const data = await loadPublicRanksData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load ranks", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch rank data" },
      { status: 500 },
    );
  }
}
