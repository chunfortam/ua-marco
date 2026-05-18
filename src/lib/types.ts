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

export interface DeckCard {
  cardNumber: string;
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  cards: DeckCard[];
  createdAt: number;
  updatedAt: number;
}

export const DECK_LIMITS = {
  MAIN_DECK_SIZE: 50,
  MAX_COPIES: 4,
  MAX_COLOR_TRIGGERS: 4,
  MAX_FINAL_TRIGGERS: 4,
  MAX_SPECIAL_TRIGGERS: 4,
} as const;

export type TriggerType = "COLOR" | "FINAL" | "SPECIAL" | "GET" | "DRAW" | "RAID" | "ACTIVE";
