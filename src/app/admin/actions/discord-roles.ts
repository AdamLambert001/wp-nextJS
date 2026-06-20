"use server";

import { revalidatePath } from "next/cache";
import { assertAdminAccess } from "@/lib/admin/admin-auth";
import { upsertDiscordPanelRoles } from "@/lib/admin/service-records";
import { isDiscordSnowflake, parsePanelRoles, type PanelRole } from "@/lib/rbac/panel-roles";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

type SaveDiscordRolesInput = {
  discordId: string;
  serviceRecordId?: string;
  discordName?: string;
  roles: PanelRole[];
};

export async function saveDiscordRolesAction(
  input: SaveDiscordRolesInput,
): Promise<AdminActionResult<void>> {
  try {
    await assertAdminAccess();

    const discordId = String(input.discordId ?? input.serviceRecordId ?? "").trim();
    if (!isDiscordSnowflake(discordId)) {
      return {
        ok: false,
        message:
          "A valid Discord numeric ID is required. Service record IDs must be Discord snowflakes to assign panel roles.",
      };
    }

    const roles = parsePanelRoles(input.roles);
    await upsertDiscordPanelRoles({
      discordId,
      discordName: input.discordName,
      roles,
    });

    revalidatePath("/admin");
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}
