import { catalogDisplayName } from "@/lib/admin/service-record-actions/display-utils";
import type { AdminOperationOption } from "@/lib/admin/load-admin-actions-data";

export type AdminSelectOption = {
  value: string;
  label: string;
  key?: string;
};

export type AdminSearchChoice = AdminSelectOption & {
  hay: string;
};

export function operationDisplayLabel(operation: AdminOperationOption): string {
  const title = catalogDisplayName(operation.title, operation.slug);
  const postDate = String(operation.postDate ?? "").trim();
  return postDate ? `${title} (${postDate})` : title;
}

export function buildAdminSearchChoices(
  options: AdminSelectOption[],
): AdminSearchChoice[] {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
    hay: `${option.label} ${option.value}`.toLowerCase(),
  }));
}

export function buildOperationSearchChoices(
  operations: AdminOperationOption[],
): AdminSearchChoice[] {
  return operations.map((operation) => {
    const label = operationDisplayLabel(operation);
    return {
      value: operation.slug,
      label,
      hay: `${label} ${operation.slug} ${operation.postDate}`.toLowerCase(),
    };
  });
}

export function buildAttendanceLogSearchChoices(
  logs: Array<{ id: string; occurredAt: string; note: string }>,
  formatLabel: (log: { id: string; occurredAt: string; note: string }) => string,
): AdminSearchChoice[] {
  return logs.map((log) => {
    const label = formatLabel(log);
    return {
      value: log.id,
      label,
      hay: `${label} ${log.note} ${log.occurredAt} ${log.id}`.toLowerCase(),
    };
  });
}
