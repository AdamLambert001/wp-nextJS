import { NextResponse } from "next/server";
import { loadProfileSettings } from "@/lib/profile/load";

export async function GET() {
  try {
    const settings = await loadProfileSettings();
    return NextResponse.json({ ok: true, ...settings });
  } catch (error) {
    console.error("Failed to load profile settings", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch profile settings" },
      { status: 500 },
    );
  }
}
