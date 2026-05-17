import type { CardData, CardInstance, FieldCard, GameState, ParsedKeywords, PlayerKey, Color } from './types.js';

let cardDataMap: Map<string, CardData> = new Map();

export function loadCardData(cards: CardData[]): void {
  cardDataMap = new Map(cards.map(c => [c.cardNumber, c]));
}

export function getCardData(cardNumber: string): CardData | undefined {
  return cardDataMap.get(cardNumber);
}

export function getAllCardData(): Map<string, CardData> {
  return cardDataMap;
}

// Seeded PRNG (mulberry32)
export function seededRandom(seed: number, counter: number): { value: number; nextCounter: number } {
  let t = (seed + counter * 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, nextCounter: counter + 1 };
}

export function shuffleArray<T>(arr: T[], seed: number, counter: number): { result: T[]; nextCounter: number } {
  const shuffled = [...arr];
  let c = counter;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const { value, nextCounter } = seededRandom(seed, c);
    c = nextCounter;
    const j = Math.floor(value * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { result: shuffled, nextCounter: c };
}

let instanceCounter = 0;
export function generateInstanceId(): string {
  instanceCounter++;
  return `inst_${Date.now()}_${instanceCounter}`;
}

export function resetInstanceCounter(): void {
  instanceCounter = 0;
}

export function createCardInstance(cardNumber: string): CardInstance {
  return { instanceId: generateInstanceId(), cardNumber };
}

export function createFieldCard(cardNumber: string, isSite: boolean = false): FieldCard {
  const data = getCardData(cardNumber);
  const bp = typeof data?.bp === 'number' ? data.bp : (typeof data?.bp === 'string' ? parseInt(data.bp) || 0 : 0);
  const keywords = parseKeywords(data);

  return {
    instanceId: generateInstanceId(),
    cardNumber,
    active: true,
    currentBP: bp,
    baseBP: bp,
    raidedOver: null,
    attacksRemaining: keywords.doubleAttack ? 2 : 1,
    blocksRemaining: keywords.doubleBlock ? 2 : 1,
    tempModifiers: [],
    usedOncePerTurn: [],
    stayRested: false,
    isSite,
  };
}

export function getOpponent(player: PlayerKey): PlayerKey {
  return player === 'player1' ? 'player2' : 'player1';
}

export function getPlayerState(state: GameState, player: PlayerKey) {
  return state[player];
}

// --- Energy Calculation ---

export function calculateEnergy(player: ReturnType<typeof getPlayerState>): Map<string, number> {
  const energy = new Map<string, number>();

  for (const card of player.energyLine) {
    const data = getCardData(card.cardNumber);
    if (!data?.generatedEnergy || card.isSite) continue;

    const parsed = parseGeneratedEnergy(data.generatedEnergy);
    if (parsed) {
      const current = energy.get(parsed.color) || 0;
      energy.set(parsed.color, current + parsed.count);
    }
  }

  // Sites on energy line also count
  for (const card of player.energyLine) {
    if (!card.isSite) continue;
    const data = getCardData(card.cardNumber);
    if (!data?.generatedEnergy) continue;
    const parsed = parseGeneratedEnergy(data.generatedEnergy);
    if (parsed) {
      const current = energy.get(parsed.color) || 0;
      energy.set(parsed.color, current + parsed.count);
    }
  }

  return energy;
}

export function parseGeneratedEnergy(energyStr: string): { color: string; count: number } | null {
  if (!energyStr) return null;
  // Format: "Purple1", "Red2", "Purple+", etc.
  const match = energyStr.match(/^(Red|Blue|Green|Yellow|Purple)(\d+|\+)?$/);
  if (!match) return null;
  const color = match[1];
  const countStr = match[2];
  const count = countStr === '+' ? 1 : (countStr ? parseInt(countStr) : 1);
  return { color, count };
}

export function parseRequiredEnergy(energyStr: string): { color: string; count: number } | null {
  if (!energyStr) return null;
  // Format: "Purple2", "Red4", "Purple-" (means 0), etc.
  const match = energyStr.match(/^(Red|Blue|Green|Yellow|Purple)(\d+|-)?$/);
  if (!match) return null;
  const color = match[1];
  const countStr = match[2];
  const count = countStr === '-' ? 0 : (countStr ? parseInt(countStr) : 0);
  return { color, count };
}

export function canPayEnergy(player: ReturnType<typeof getPlayerState>, cardNumber: string): boolean {
  const data = getCardData(cardNumber);
  if (!data?.requiredEnergy) return true;

  const required = parseRequiredEnergy(data.requiredEnergy);
  if (!required || required.count === 0) return true;

  const available = calculateEnergy(player);
  const availableOfColor = available.get(required.color) || 0;
  return availableOfColor >= required.count;
}

export function canPayAP(player: ReturnType<typeof getPlayerState>, cardNumber: string): boolean {
  const data = getCardData(cardNumber);
  const apCost = typeof data?.apCost === 'number' ? data.apCost : (typeof data?.apCost === 'string' ? parseInt(data.apCost) || 0 : 0);
  if (apCost === 0) return true;

  const activeAP = player.ap.filter(ap => ap.active).length;
  return activeAP >= apCost;
}

export function payAP(player: ReturnType<typeof getPlayerState>, cardNumber: string): void {
  const data = getCardData(cardNumber);
  const apCost = typeof data?.apCost === 'number' ? data.apCost : (typeof data?.apCost === 'string' ? parseInt(data.apCost) || 0 : 0);

  let remaining = apCost;
  for (const ap of player.ap) {
    if (remaining <= 0) break;
    if (ap.active) {
      ap.active = false;
      remaining--;
    }
  }
}

// --- Keyword Parsing ---

export function parseKeywords(data: CardData | undefined): ParsedKeywords {
  const result: ParsedKeywords = {
    impact: 0,
    damage: 0,
    step: false,
    doubleAttack: false,
    doubleBlock: false,
    snipe: false,
    nullifyImpact: false,
    raid: null,
  };

  if (!data?.effect) return result;
  const effect = data.effect;

  // Impact (can be "Impact" or "Impact +1" etc.)
  if (/\bNullify Impact\b/i.test(effect)) {
    result.nullifyImpact = true;
  } else if (/\bImpact\b/i.test(effect)) {
    const impactMatch = effect.match(/Impact\s*\+?\s*(\d+)/i);
    result.impact = impactMatch ? parseInt(impactMatch[1]) : 1;
  }

  // Damage X
  const damageMatch = effect.match(/\bDamage\s+(\d+)\b/i);
  if (damageMatch) {
    result.damage = parseInt(damageMatch[1]);
  }

  // Step
  if (/\[?Step\]?/i.test(effect)) {
    result.step = true;
  }

  // Double Attack
  if (/\bDouble Attack\b/i.test(effect)) {
    result.doubleAttack = true;
  }

  // Double Block
  if (/\bDouble Block\b/i.test(effect)) {
    result.doubleBlock = true;
  }

  // Snipe
  if (/\bSnipe\b/i.test(effect)) {
    result.snipe = true;
  }

  // RAID
  if (/\[RAID\]/i.test(effect)) {
    const raidMatch = effect.match(/\[RAID\]\s*[:\-]?\s*(.+?)(?:\]|\n|$)/i);
    result.raid = raidMatch ? raidMatch[1].trim() : 'any';
  }

  return result;
}

export function parseTriggerType(data: CardData | undefined): string | null {
  if (!data?.trigger) return null;
  const trigger = data.trigger.toUpperCase();
  if (trigger.includes('GET')) return 'GET';
  if (trigger.includes('DRAW')) return 'DRAW';
  if (trigger.includes('SPECIAL')) return 'SPECIAL';
  if (trigger.includes('COLOR')) return 'COLOR';
  if (trigger.includes('FINAL')) return 'FINAL';
  if (trigger.includes('ACTIVE')) return 'ACTIVE';
  if (trigger.includes('RAID')) return 'RAID';
  return null;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

export function getTotalEnergyCount(player: ReturnType<typeof getPlayerState>): number {
  let total = 0;
  const energy = calculateEnergy(player);
  for (const count of energy.values()) {
    total += count;
  }
  return total;
}
