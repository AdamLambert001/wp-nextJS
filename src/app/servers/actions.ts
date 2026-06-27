"use server";

import { revalidatePath } from "next/cache";
import { hasAnyPermission } from "@/lib/rbac/access";
import { getAccess } from "@/lib/rbac/get-access";
import { Permission } from "@/lib/rbac/permissions";
import { queryServerStatus } from "@/lib/servers/status";
import {
  createGameServer,
  findPublicGameServer,
  updateGameServer,
} from "@/lib/servers/store";
import type { ServerCardData, ServerStatus } from "@/lib/servers/types";
import { parseServerFormInput } from "@/lib/servers/validation";

type ServerActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

function actionError(error: unknown): ServerActionResult<never> {
  if (error instanceof Error) {
    return { ok: false, message: error.message };
  }

  return { ok: false, message: "Action failed" };
}

async function assertServerAdminAccess() {
  const access = await getAccess();

  if (!access.authenticated) {
    throw new Error("You must be signed in.");
  }

  if (
    !hasAnyPermission(access.permissions, [
      Permission.CONTROL_SERVERS,
      Permission.MANAGE_SERVER,
    ])
  ) {
    throw new Error("Server control access is required.");
  }
}

export async function addServerAction(
  input: unknown,
): Promise<ServerActionResult<ServerCardData>> {
  try {
    await assertServerAdminAccess();
    const server = await createGameServer(parseServerFormInput(input));
    revalidatePath("/servers");

    return { ok: true, data: { ...server, status: await queryServerStatus(server) } };
  } catch (error) {
    return actionError(error);
  }
}

export async function editServerAction(
  id: string,
  input: unknown,
): Promise<ServerActionResult<ServerCardData>> {
  try {
    await assertServerAdminAccess();
    const server = await updateGameServer(id, parseServerFormInput(input));
    revalidatePath("/servers");

    return { ok: true, data: { ...server, status: await queryServerStatus(server) } };
  } catch (error) {
    return actionError(error);
  }
}

export async function refreshServerStatusAction(
  id: string,
): Promise<ServerActionResult<ServerStatus>> {
  try {
    const server = await findPublicGameServer(id);
    if (!server) {
      throw new Error("Server not found.");
    }

    return { ok: true, data: await queryServerStatus(server) };
  } catch (error) {
    return actionError(error);
  }
}
