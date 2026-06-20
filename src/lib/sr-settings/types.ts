import type { OrbatSettings } from "@/lib/orbat/types";
import type { RankCategoryDefinition } from "@/lib/profile/types";

export type RadioChannelColumn = {
  id: string;
  title: string;
  squadRadioNet: string;
  fireteamRadioNetRed: string;
  fireteamRadioNetBlue: string;
  longRangeRole: string;
  longRangeFrequency: string;
};

export type RadioChannelsSettings = {
  shortRangeHeader: string;
  longRangeHeader: string;
  longRangeFrequencyLabel: string;
  columns: RadioChannelColumn[];
};

export type AdminDepartmentPosition = {
  id: string;
  name: string;
  assignedUserId: string;
  status: "open" | "closed";
};

export type AdminDepartmentSubcategory = {
  id: string;
  title: string;
  positions: AdminDepartmentPosition[];
};

export type AdminDepartment = {
  id: string;
  title: string;
  subcategories: AdminDepartmentSubcategory[];
};

export type TrainingCategoryItem = {
  slug: string;
  label: string;
};

export type TrainingCategory = {
  id: string;
  title: string;
  items: TrainingCategoryItem[];
};

export type MedalSettings = {
  slug: string;
  displayName: string;
  pictureUrl: string;
  description: string;
};

export type CampaignRibbonSettings = {
  slug: string;
  displayName: string;
  pictureUrl: string;
  description: string;
};

export type SrSettings = {
  trainingCategories: TrainingCategory[];
  rankCategories: RankCategoryDefinition[];
  medals: MedalSettings[];
  campaignRibbons: CampaignRibbonSettings[];
  orbatSettings: OrbatSettings;
  radioChannels: RadioChannelsSettings;
  assignments: string[];
  assignmentPositions: Record<string, string[]>;
  adminDepartments: AdminDepartment[];
};

export type SrCapabilities = {
  authenticated: boolean;
  effectiveSrAdmin: boolean;
  canManageServer: boolean;
  canEditMemberList: boolean;
  srSquadLeader: boolean;
  srTrainer: boolean;
  srRecruiter: boolean;
  canEditOrbatStructure: boolean;
  canAssignOrbatPositions: boolean;
  canEditRankBoard: boolean;
  canEditRadiosBoard: boolean;
  canEditAdminDepartments: boolean;
  canEditLore: boolean;
  canOpenSrStudio: boolean;
  canEdit: boolean;
};

export type AdminDepartmentUserSummary = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  rank: string;
};
