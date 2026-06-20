"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/admin/admin-auth";
import {
  loadDetachmentTagEntries,
  saveDetachmentTags,
  type DetachmentTagConfig,
} from "@/lib/admin/detachment-tags";
import type { DetachmentTagEntry } from "@/lib/admin/detachment-tags.shared";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function loadDetachmentTagsAction(): Promise<AdminActionResult<DetachmentTagEntry[]>> {
  try {
    await assertAdminAccess();
    const tags = await loadDetachmentTagEntries();
    return { ok: true, data: tags };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveDetachmentTagsAction(
  tags: DetachmentTagConfig[],
): Promise<AdminActionResult<DetachmentTagEntry[]>> {
  try {
    await assertAdminAccess();
    const saved = await saveDetachmentTags(tags);
    revalidatePath("/admin");
    return { ok: true, data: saved };
  } catch (error) {
    return actionError(error);
  }
}
