import { composeSrPickLabel } from "@/lib/admin/service-record-actions/display-utils";
import { getOpsDashboardBundle } from "@/lib/ops/store";
import { loadOrbatSettingsFromDb } from "@/lib/orbat/load";
import { buildOrbatFilterSections, type OrbatFilterSection } from "@/lib/orbat/filter-sections";
import { getAccess } from "@/lib/rbac/get-access";
import { prisma } from "@/lib/prisma";
import { loadSrSettingsFromDb } from "@/lib/sr-settings/load";
import { getSrCapabilities } from "@/lib/sr-settings/permissions";
import type { SrCapabilities, SrSettings } from "@/lib/sr-settings/types";
import { loadServerSettingsFromDb } from "@/lib/server-settings/load";

export type { OrbatFilterSection };

export type AdminPickerUser = {
  id: string;
  label: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  rank: string | null;
};

export type AdminOperationOption = {
  slug: string;
  title: string;
  postDate: string;
};

export type AdminActionsData = {
  capabilities: SrCapabilities;
  users: AdminPickerUser[];
  settings: Pick<
    SrSettings,
    "trainingCategories" | "rankCategories" | "medals" | "campaignRibbons"
  >;
  operations: AdminOperationOption[];
  orbatSections: OrbatFilterSection[];
  secondaryColorHex: string;
};

export async function loadAdminActionsData(): Promise<AdminActionsData> {
  const access = await getAccess();
  const capabilities = getSrCapabilities(access.flags, access.authenticated);

  const [records, settings, opsBundle, orbatSettings, serverSettings] = await Promise.all([
    prisma.serviceRecord.findMany({
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        rank: true,
      },
    }),
    loadSrSettingsFromDb(),
    getOpsDashboardBundle(),
    loadOrbatSettingsFromDb(),
    loadServerSettingsFromDb(),
  ]);

  const users = records.map((record) => ({
    id: record.id,
    label: composeSrPickLabel(record),
    firstName: record.firstName,
    lastName: record.lastName,
    displayName: record.displayName,
    rank: record.rank,
  }));

  const operations = (opsBundle.operations ?? [])
    .map((operation) => ({
      slug: String(operation.opfreindlyname ?? "").trim(),
      title: String(operation.Operationtitle ?? operation.opfreindlyname ?? "").trim(),
      postDate: String(operation.postDate ?? "").trim(),
    }))
    .filter((operation) => operation.slug)
    .sort((a, b) => b.postDate.localeCompare(a.postDate) || a.title.localeCompare(b.title));

  return {
    capabilities,
    users,
    settings: {
      trainingCategories: settings.trainingCategories,
      rankCategories: settings.rankCategories,
      medals: settings.medals,
      campaignRibbons: settings.campaignRibbons,
    },
    operations,
    orbatSections: buildOrbatFilterSections(orbatSettings),
    secondaryColorHex: serverSettings.secondaryColorHex,
  };
}
