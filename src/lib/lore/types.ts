export type LoreAsset = {
  id: string;
  title: string;
  category: string;
  description: string;
  pictureUrl: string;
};

export type UnitLore = {
  backgroundLore: string;
  assetCategories: string[];
  assets: LoreAsset[];
};
