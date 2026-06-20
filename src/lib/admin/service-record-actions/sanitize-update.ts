import type {
  ServiceRecordDetail,
  ServiceRecordDetailUpdate,
} from "@/lib/admin/service-record-detail";
import type { DiscordPermissionFlags } from "@/lib/rbac/discord-role-mapper";
import { effectiveSrAdmin } from "@/lib/sr-settings/permissions";

/**
 * Strips fields the caller is not allowed to change via direct service-record
 * updates, so privileged paths (medals, attendance, rank, training) cannot be
 * bypassed through the edit dialog.
 */
export function sanitizeServiceRecordUpdate(
  input: ServiceRecordDetailUpdate,
  existing: ServiceRecordDetail,
  flags: DiscordPermissionFlags,
): ServiceRecordDetailUpdate {
  const panelAdmin = flags.canManageServer;
  const squadLeaderBulk = effectiveSrAdmin(flags) || flags.srSquadLeader;
  const trainer = effectiveSrAdmin(flags) || flags.srTrainer;

  return {
    ...input,
    ...(panelAdmin
      ? {}
      : {
          awards: existing.awards,
          campaignRib: existing.campaignRib,
        }),
    ...(squadLeaderBulk
      ? {}
      : {
          rank: existing.rank,
          operationCount: existing.operationCount,
          coolDown: existing.coolDown,
        }),
    ...(trainer
      ? {}
      : {
          trainings: existing.trainings,
        }),
  };
}
