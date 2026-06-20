export type OperationTimeRow = {
  label: string;
  bstTime: string;
  estTime: string;
};

export type TerrainConditions = {
  environmentalElements: string;
  timeOfDay: string;
  terrain: string;
  localsPresence: string;
  planopsLink: string;
  operationTimeTable: OperationTimeRow[];
};

export type CampaignLinkedAsset = {
  assetId: string;
  status: string;
};

export type CampaignIntelRow = {
  label: string;
  value: string;
};

export type LegacyCampaign = {
  id: string;
  title: string;
  slug: string;
  progress: string;
  startDate: string;
  endDate: string;
  loreDate: string;
  overview: string;
  hostileStrengthLevel: string;
  hostileAssets: string;
  sector: string;
  environmentalThreats: string;
  linkedAssets: CampaignLinkedAsset[];
  additionalIntel: CampaignIntelRow[];
};

export type OperationCampaignRef = {
  id: string;
  title: string;
  slug: string;
};

export type LegacyOperation = {
  Operationtitle: string;
  opfreindlyname: string;
  postDate: string;
  loreDate: string;
  date: string;
  planet: string;
  sector: string;
  opposingforce: string;
  postedTime: string;
  missionstatement: string;
  opdescription: string;
  mainobjective: string;
  secondaryobjective: string;
  optionalobjectives: string[];
  terrainConditions: TerrainConditions;
  attendees: string[];
  campaignId?: string;
  campaign?: OperationCampaignRef | null;
};

export type OpsDashboardBundle = {
  version: number;
  campaigns: LegacyCampaign[];
  operations: LegacyOperation[];
};

export type OpsCapabilities = {
  authenticated: boolean;
  canManageOps: boolean;
};

export type AttendeeCandidate = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  rank: string;
};
