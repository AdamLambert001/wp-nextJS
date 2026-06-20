import { NextResponse } from "next/server";
import { loadPublicAdminDepartmentsData } from "@/lib/sr-settings/load";

export async function GET() {
  try {
    const data = await loadPublicAdminDepartmentsData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load admin departments", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch admin departments data" },
      { status: 500 },
    );
  }
}
