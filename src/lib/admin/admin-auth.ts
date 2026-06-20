import { getAccess, requireAccess } from "@/lib/rbac/get-access";
import { Permission } from "@/lib/rbac/permissions";
import { canEditMemberList } from "@/lib/sr-settings/permissions";

export async function assertAdminPageAccess() {
  await requireAccess([Permission.ACCESS_ADMIN]);
}

export async function assertPanelAdminAccess() {
  await requireAccess([Permission.MANAGE_SERVER]);
}

/** Full panel admin — roles, tags, and other sensitive admin actions. */
export async function assertAdminAccess() {
  await assertPanelAdminAccess();
}

export async function assertMemberListEditAccess() {
  const access = await getAccess();
  if (!access.authenticated) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!canEditMemberList(access.flags)) {
    throw new Error("FORBIDDEN");
  }
}
