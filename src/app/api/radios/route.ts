import { NextResponse } from "next/server";
import { loadPublicRadiosData } from "@/lib/sr-settings/load";

export async function GET() {
  try {
    const data = await loadPublicRadiosData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load radios", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch radio data" },
      { status: 500 },
    );
  }
}
