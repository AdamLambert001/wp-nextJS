import { getAccess } from "@/lib/rbac/get-access";
import type { AccessContext } from "@/lib/rbac/types";
import { effectiveSrAdmin } from "@/lib/sr-settings/permissions";

export class ServiceRecordActionError extends Error {
  constructor(
    message: string,
    readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_INPUT" | "NOT_FOUND" = "INVALID_INPUT",
  ) {
    super(message);
    this.name = "ServiceRecordActionError";
  }
}

async function requireAuthenticatedAccess(): Promise<AccessContext> {
  const access = await getAccess();
  if (!access.authenticated) {
    throw new ServiceRecordActionError("You must be signed in.", "UNAUTHENTICATED");
  }
  return access;
}

export async function assertEffectiveSrAdminAccess(): Promise<AccessContext> {
  const access = await requireAuthenticatedAccess();
  if (!effectiveSrAdmin(access.flags)) {
    throw new ServiceRecordActionError("SR admin access is required.", "FORBIDDEN");
  }
  return access;
}

export async function assertPanelAdminAccess(): Promise<AccessContext> {
  const access = await requireAuthenticatedAccess();
  if (!access.flags.canManageServer) {
    throw new ServiceRecordActionError("Panel admin access is required.", "FORBIDDEN");
  }
  return access;
}

export async function assertSrSquadLeaderBulkAccess(): Promise<AccessContext> {
  const access = await requireAuthenticatedAccess();
  if (!(effectiveSrAdmin(access.flags) || access.flags.srSquadLeader)) {
    throw new ServiceRecordActionError("Squad leader or SR admin access is required.", "FORBIDDEN");
  }
  return access;
}

export async function assertSrTrainerAccess(): Promise<AccessContext> {
  const access = await requireAuthenticatedAccess();
  if (!(effectiveSrAdmin(access.flags) || access.flags.srTrainer)) {
    throw new ServiceRecordActionError("Trainer or SR admin access is required.", "FORBIDDEN");
  }
  return access;
}

export async function assertSrLeadAccess(): Promise<AccessContext> {
  const access = await requireAuthenticatedAccess();
  if (
    !(
      effectiveSrAdmin(access.flags) ||
      access.flags.srSquadLeader ||
      access.flags.srTrainer
    )
  ) {
    throw new ServiceRecordActionError(
      "Squad lead, team lead, or SR admin access is required.",
      "FORBIDDEN",
    );
  }
  return access;
}
