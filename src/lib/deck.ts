import type { Deck, DeckCard } from "./types";
import { DECK_LIMITS } from "./types";
import { getAllCards, getCardByNumber } from "./cards";

export function getTriggerType(trigger: string): string | null {
  if (!trigger) return null;
  const lower = trigger.toLowerCase();
  if (lower.startsWith("[color]")) return "COLOR";
  if (lower.startsWith("[final]")) return "FINAL";
  if (lower.startsWith("[special]")) return "SPECIAL";
  if (lower.startsWith("[get]")) return "GET";
  if (lower.startsWith("[draw]")) return "DRAW";
  if (lower.startsWith("[raid]")) return "RAID";
  if (lower.startsWith("[active]")) return "ACTIVE";
  return null;
}

export function getTotalCards(deckCards: DeckCard[]): number {
  return deckCards.reduce((sum, dc) => sum + dc.count, 0);
}

export interface DeckStats {
  totalCards: number;
  characterCount: number;
  eventCount: number;
  siteCount: number;
  triggerCounts: Record<string, number>;
  colorCounts: Record<string, number>;
  costDistribution: Record<number, number>;
  bpDistribution: Record<number, number>;
  triggerTotal: number;
}

export function getDeckStats(deckCards: DeckCard[]): DeckStats {
  const stats: DeckStats = {
    totalCards: 0,
    characterCount: 0,
    eventCount: 0,
    siteCount: 0,
    triggerCounts: {},
    colorCounts: {},
    costDistribution: {},
    bpDistribution: {},
    triggerTotal: 0,
  };

  for (const dc of deckCards) {
    const card = getCardByNumber(dc.cardNumber);
    if (!card) continue;

    stats.totalCards += dc.count;

    if (card.cardType === "Character") stats.characterCount += dc.count;
    else if (card.cardType === "Event") stats.eventCount += dc.count;
    else if (card.cardType === "Site") stats.siteCount += dc.count;

    if (card.trigger) {
      const triggerType = getTriggerType(card.trigger);
      if (triggerType) {
        stats.triggerCounts[triggerType] = (stats.triggerCounts[triggerType] || 0) + dc.count;
        stats.triggerTotal += dc.count;
      }
    }

    if (card.requiredEnergyColor) {
      stats.colorCounts[card.requiredEnergyColor] =
        (stats.colorCounts[card.requiredEnergyColor] || 0) + dc.count;
    }

    const cost = Number(card.requiredEnergyCount) || 0;
    stats.costDistribution[cost] = (stats.costDistribution[cost] || 0) + dc.count;

    if (card.cardType === "Character" && card.bp) {
      const bp = Number(card.bp) || 0;
      stats.bpDistribution[bp] = (stats.bpDistribution[bp] || 0) + dc.count;
    }
  }

  return stats;
}

export function saveDeckToStorage(deck: Deck): void {
  const decks = loadDecksFromStorage();
  const idx = decks.findIndex((d) => d.id === deck.id);
  const updated = { ...deck, updatedAt: Date.now() };
  if (idx >= 0) {
    decks[idx] = updated;
  } else {
    decks.push(updated);
  }
  localStorage.setItem("ua-decks", JSON.stringify(decks));
}

export function loadDecksFromStorage(): Deck[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ua-decks");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteDeckFromStorage(deckId: string): void {
  const decks = loadDecksFromStorage().filter((d) => d.id !== deckId);
  localStorage.setItem("ua-decks", JSON.stringify(decks));
}

export function exportDeckToText(deck: Deck): string {
  const lines: string[] = [`// ${deck.name}`, ""];
  const allCards = getAllCards();

  const characterLines: string[] = [];
  const eventSiteLines: string[] = [];

  for (const dc of deck.cards) {
    const card = allCards.find((c) => c.cardNumber === dc.cardNumber);
    if (!card) continue;
    const line = `${dc.count}x ${card.cardNumber} ${card.name}`;
    if (card.cardType === "Character") {
      characterLines.push(line);
    } else {
      eventSiteLines.push(line);
    }
  }

  if (characterLines.length > 0) {
    lines.push("// Characters");
    lines.push(...characterLines);
    lines.push("");
  }
  if (eventSiteLines.length > 0) {
    lines.push("// Events & Sites");
    lines.push(...eventSiteLines);
  }

  return lines.join("\n");
}

export function importDeckFromText(text: string): DeckCard[] {
  const cards: DeckCard[] = [];
  const allCards = getAllCards();

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;

    const match = trimmed.match(/^(\d+)\s*x?\s+(.+)/);
    if (!match) continue;

    const count = parseInt(match[1], 10);
    const rest = match[2].trim();

    const card = allCards.find(
      (c) => c.cardNumber === rest || c.cardNumber.endsWith(`/${rest}`)
    );
    if (card && count > 0) {
      cards.push({ cardNumber: card.cardNumber, count: Math.min(count, DECK_LIMITS.MAX_COPIES) });
    }
  }

  return cards;
}
