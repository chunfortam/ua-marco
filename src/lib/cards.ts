import cardsData from "@/data/cards.json";
import type { Card, FilterState } from "./types";

const cards: Card[] = cardsData as Card[];

const RARITY_ORDER: Record<string, number> = {
  C: 0,
  U: 1,
  R: 2,
  SR: 3,
  UR: 4,
  SEC: 5,
};

export function getAllCards(): Card[] {
  return cards;
}

export function getCardByNumber(cardNumber: string): Card | undefined {
  return cards.find((c) => c.cardNumber === cardNumber);
}

// Lazily-built index: trailing card ID (e.g. "EVA-1-085") → UE card
let enByTrailing: Map<string, Card> | null = null;

function buildEnIndex(): Map<string, Card> {
  const map = new Map<string, Card>();
  for (const c of cards) {
    if (c.cardNumber.startsWith("UE") && c.cardNumber.includes("/")) {
      const trailing = c.cardNumber.split("/")[1];
      if (!map.has(trailing)) map.set(trailing, c);
    }
  }
  return map;
}

/**
 * For a JP (UA-prefix) card, look up the English (UE-prefix) equivalent
 * by matching the trailing card identifier (e.g. EVA-1-085).
 * Returns undefined when no English version exists.
 */
export function getEnglishEquivalent(cardNumber: string): Card | undefined {
  if (!cardNumber.startsWith("UA") || !cardNumber.includes("/")) return undefined;
  if (!enByTrailing) enByTrailing = buildEnIndex();
  const trailing = cardNumber.split("/")[1];
  return enByTrailing.get(trailing);
}

/** Returns true if the string contains CJK / Hiragana / Katakana characters. */
export function hasJapaneseText(text: string | undefined): boolean {
  if (!text) return false;
  return /[\u3000-\u9FFF\uF900-\uFAFF]/.test(text);
}

export function getUniqueSets(): string[] {
  const sets = new Set<string>();
  for (const card of cards) {
    if (card.setCode) sets.add(card.setCode);
  }
  return Array.from(sets).sort();
}

export function getUniqueAffinities(): string[] {
  const affinities = new Set<string>();
  for (const card of cards) {
    if (card.affinity) affinities.add(card.affinity);
  }
  return Array.from(affinities).sort();
}

export function filterCards(filters: Partial<FilterState>): Card[] {
  let result = [...cards];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.cardNumber?.toLowerCase().includes(q) ||
        c.effect?.toLowerCase().includes(q) ||
        c.affinity?.toLowerCase().includes(q)
    );
  }

  if (filters.cardType && filters.cardType !== "all") {
    result = result.filter((c) => c.cardType === filters.cardType);
  }

  if (filters.color && filters.color !== "all") {
    result = result.filter(
      (c) =>
        c.requiredEnergyColor?.toLowerCase() === filters.color?.toLowerCase()
    );
  }

  if (filters.rarity && filters.rarity !== "all") {
    result = result.filter((c) => c.rarity === filters.rarity);
  }

  if (filters.set && filters.set !== "all") {
    result = result.filter((c) => c.setCode === filters.set);
  }

  const sortBy = filters.sortBy || "number-asc";
  result.sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return (a.name || "").localeCompare(b.name || "");
      case "name-desc":
        return (b.name || "").localeCompare(a.name || "");
      case "bp-asc":
        return (Number(a.bp) || 0) - (Number(b.bp) || 0);
      case "bp-desc":
        return (Number(b.bp) || 0) - (Number(a.bp) || 0);
      case "rarity-asc":
        return (
          (RARITY_ORDER[a.rarity || ""] ?? 99) -
          (RARITY_ORDER[b.rarity || ""] ?? 99)
        );
      case "number-asc":
      default:
        return (a.cardNumber || "").localeCompare(b.cardNumber || "");
    }
  });

  return result;
}

export function getCardStats() {
  const total = cards.length;
  const byType: Record<string, number> = {};
  const byRarity: Record<string, number> = {};
  const byColor: Record<string, number> = {};

  for (const card of cards) {
    const t = card.cardType || "Unknown";
    byType[t] = (byType[t] || 0) + 1;

    if (card.rarity) {
      byRarity[card.rarity] = (byRarity[card.rarity] || 0) + 1;
    }

    if (card.requiredEnergyColor) {
      byColor[card.requiredEnergyColor] =
        (byColor[card.requiredEnergyColor] || 0) + 1;
    }
  }

  return { total, byType, byRarity, byColor };
}
