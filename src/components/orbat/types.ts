export type OrbatDragState =
  | { type: "category"; catIdx: number }
  | { type: "row"; catIdx: number; groupIdx: number; rowIdx: number }
  | null;
