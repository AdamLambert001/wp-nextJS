"use server";

import { revalidatePath } from "next/cache";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";
import { assertPanelAdminAccess } from "@/lib/admin/service-record-actions/auth";
import { loadHomePageContent } from "@/lib/home/load";
import { saveHomePageContent } from "@/lib/home/save";
import type { HomePageContent } from "@/lib/home/types";

export async function loadHomePageContentAction(): Promise<AdminActionResult<HomePageContent>> {
  try {
    await assertPanelAdminAccess();
    const content = await loadHomePageContent();
    return { ok: true, data: content };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveHomePageContentAction(
  content: HomePageContent,
): Promise<AdminActionResult<HomePageContent>> {
  try {
    await assertPanelAdminAccess();
    const saved = await saveHomePageContent(content);
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true, data: saved };
  } catch (error) {
    return actionError(error);
  }
}
