export type OrbatRow = {
  id: string;
  position: string;
  assignedUserId: string;
  lastEditedAt: string;
};

export type OrbatGroup = {
  id: string;
  title: string;
  color: string;
  backgroundImage: string;
  trainingCategoryId: string;
  rows: OrbatRow[];
};

export type OrbatCategory = {
  id: string;
  title: string;
  groups: OrbatGroup[];
};

export type OrbatSettings = {
  categories: OrbatCategory[];
};

export type OrbatUserSummary = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  rank: string;
  operationCount: number;
  coolDown: number;
  trainings: string[];
  lastOperationAttended: string | null;
};

export type TrainingCategorySummary = {
  id: string;
  title: string;
  items: { slug: string; label: string }[];
};

export type OrbatMemberOption = {
  id: string;
  displayName: string;
  rank: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type OrbatCapabilities = {
  canEditStructure: boolean;
  canAssignPositions: boolean;
  canEdit: boolean;
};
