export interface Card {
  cardNumber: string;
  name: string;
  rarity?: string;
  imageUrl?: string;
  title?: string;
  requiredEnergy?: string;
  requiredEnergyColor?: string;
  requiredEnergyCount?: number;
  apCost?: number | string;
  cardType?: string;
  bp?: number | string;
  affinity?: string;
  generatedEnergy?: string;
  effect?: string;
  trigger?: string;
  setName?: string;
  setCode?: string;
  seriesCode?: string;
  isParallel?: boolean;
}

export interface FilterState {
  search: string;
  cardType: string;
  color: string;
  rarity: string;
  set: string;
  sortBy: string;
}

export const CARD_TYPES = ["Character", "Event", "Site", "Action Point"] as const;

export const COLORS = ["Red", "Blue", "Green", "Yellow", "Purple"] as const;

export const RARITIES = ["C", "U", "R", "SR", "UR", "SEC"] as const;

export const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "bp-asc", label: "BP (Low to High)" },
  { value: "bp-desc", label: "BP (High to Low)" },
  { value: "number-asc", label: "Card Number" },
  { value: "rarity-asc", label: "Rarity" },
] as const;
