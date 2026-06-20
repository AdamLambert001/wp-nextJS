export const BASE_TERRAIN_CONDITIONS = {
  environmentalElements: "Clear with fog",
  timeOfDay: "8 AM local time",
  terrain: "Thick forests",
  localsPresence: "In active hiding",
  planopsLink: "Link compromised",
  operationTimeTable: [
    { label: "Leadership Load in:", bstTime: "18:30 BST", estTime: "13:30 EST" },
    { label: "General Load in:", bstTime: "19:00 BST", estTime: "14:00 EST" },
    { label: "Step Off:", bstTime: "19:30 BST", estTime: "14:30 EST" },
    { label: "Soft Cut off:", bstTime: "21:30 BST", estTime: "16:30 EST" },
    { label: "Hard Cut off:", bstTime: "22:00 BST", estTime: "17:00 EST" },
  ],
} as const;

export const BASE_DEFAULT_OP_META = {
  planet: "Meridian",
  sector: "Eastern coast",
  opposingforce: "Covenant",
} as const;

export const ASSET_LINK_STATUSES = [
  "Active",
  "Eliminated",
  "Destroyed",
  "In-Contact",
  "Fleeing",
  "Unknown",
] as const;

export const CAMPAIGN_PROGRESS_VALUES = ["Planned", "In-Progress", "Completed"] as const;
