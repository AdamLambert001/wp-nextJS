import { NextResponse } from "next/server";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";

export async function GET() {
  try {
    const settings = await loadSrSettingsFromDb();
    return NextResponse.json({
      ok: true,
      trainingCategories: settings.trainingCategories,
      rankCategories: settings.rankCategories,
      medals: settings.medals,
      campaignRibbons: settings.campaignRibbons,
    });
  } catch (error) {
    console.error("Failed to load training settings", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch training settings" },
      { status: 500 },
    );
  }
}
