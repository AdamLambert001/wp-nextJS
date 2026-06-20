import type { ProfileLogCategory } from "@/generated/prisma/client";

export type AwardTuple = [string, string];

export type PublicProfileRow = {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  rank: string | null;
  assignment: string | null;
  position: string | null;
  profileDisplayName: string;
  lastOperationAttended: string | null;
  avatarUrl: string;
};

export type PublicProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  rank: string | null;
  assignment: string | null;
  position: string | null;
  primaryMOS: string | null;
  operationCount: number;
  coolDown: number;
  datePromoted: string | null;
  dateJoined: string | null;
  avatarUrl: string | null;
  awards: AwardTuple[];
  campaignRib: AwardTuple[];
  trainings: string[];
  lastOperationAttended: string | null;
  profileDisplayName: string;
  campaignAttendance: CampaignAttendanceEntry[];
};

export type CampaignAttendanceEntry = {
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  attendedOps: number;
  totalOps: number;
  ratio: number;
  ratioPercent: number;
  thresholdPercent: number;
  thresholdReachedByRounding: boolean;
  qualified: boolean;
};

export type ProfileLogEntry = {
  id: string;
  category: ProfileLogCategory;
  occurredAt: string;
  note: string;
  createdAt: string;
};

export type MedalDefinition = {
  slug: string;
  displayName: string;
  pictureUrl: string;
  description: string;
};

export type RibbonDefinition = {
  slug: string;
  displayName: string;
  pictureUrl: string;
  description: string;
};

export type RankCategoryDefinition = {
  id: string;
  title: string;
  items: {
    slug: string;
    label: string;
    abbr: string;
    cooldown: number;
    description: string;
    iconUrl: string;
  }[];
};

export type TrainingCategoryDefinition = {
  id: string;
  title: string;
  items: { slug: string; label: string }[];
};

export type ProfileSettings = {
  medals: MedalDefinition[];
  campaignRibbons: RibbonDefinition[];
  trainingCategories: TrainingCategoryDefinition[];
  rankCategories: RankCategoryDefinition[];
};
