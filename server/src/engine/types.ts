// ==========================================
// Union Arena TCG – Game Engine Types
// ==========================================

// --- Card Data (loaded from cards.json) ---

export interface CardData {
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

// --- Core Game Types ---

export type Phase = 'SETUP' | 'MULLIGAN' | 'START' | 'MOVEMENT' | 'MAIN' | 'ATTACK' | 'END';
export type PlayerKey = 'player1' | 'player2';
export type Color = 'Red' | 'Blue' | 'Green' | 'Yellow' | 'Purple';

export interface GameState {
  id: string;
  turn: number;
  phase: Phase;
  activePlayer: PlayerKey;
  firstPlayer: PlayerKey;  // which player goes first (set after mulligan)
  firstTurnOfGame: boolean;
  winner: PlayerKey | null;
  winReason: string | null;

  player1: PlayerState;
  player2: PlayerState;

  pendingAction: PendingAction | null;
  actionLog: ActionLogEntry[];
  rngSeed: number;
  rngCounter: number;
}

export interface PlayerState {
  id: string;
  deck: CardInstance[];
  hand: CardInstance[];
  life: CardInstance[];
  frontLine: FieldCard[];
  energyLine: FieldCard[];
  sidelineArea: CardInstance[];
  removeArea: CardInstance[];
  ap: APState[];

  extraDrawUsed: boolean;
  mulliganDone: boolean;
  attackedThisPhase: string[];
}

export interface CardInstance {
  instanceId: string;
  cardNumber: string;
}

export interface FieldCard extends CardInstance {
  active: boolean;
  currentBP: number;
  baseBP: number;
  raidedOver: CardInstance | null;
  attacksRemaining: number;
  blocksRemaining: number;
  tempModifiers: Modifier[];
  usedOncePerTurn: string[];
  isSite: boolean;
}

export interface APState {
  active: boolean;
}

export interface Modifier {
  type: 'BP_CHANGE';
  value: number;
  expiresAt: 'END_OF_TURN' | 'END_OF_ATTACK' | 'PERMANENT';
}

// --- Pending Actions (what the game awaits) ---

export type PendingAction =
  | { type: 'MULLIGAN_DECISION'; player: PlayerKey }
  | { type: 'BLOCK_DECISION'; player: PlayerKey; attackerInstanceId: string; attackerPlayer: PlayerKey }
  | { type: 'CHOOSE_DISCARD'; player: PlayerKey; count: number }
  | { type: 'CHOOSE_REMOVE_FROM_LINE'; player: PlayerKey; line: 'frontLine' | 'energyLine'; reason: string }
  | { type: 'SPECIAL_TRIGGER_CHOOSE'; player: PlayerKey }
  | { type: 'COLOR_TRIGGER_CHOOSE'; player: PlayerKey; color: string }
  | { type: 'SNIPE_CHOOSE'; player: PlayerKey; attackerInstanceId: string }
  | { type: 'RAID_TRIGGER_CHOOSE'; player: PlayerKey; raidCard: CardInstance }
  | { type: 'EXTRA_DRAW_DECISION'; player: PlayerKey }
  | { type: 'ACTIVE_TRIGGER_CHOOSE'; player: PlayerKey }
  | { type: 'GET_TRIGGER_RESOLVED'; player: PlayerKey; card: CardInstance }
  | { type: 'CHOOSE_LIFE_TO_FLIP'; player: PlayerKey; damagedPlayer: PlayerKey; attackerInstanceId: string; attackerPlayer: PlayerKey; damageRemaining: number };

// --- Player Actions (client → server) ---

export type PlayerAction =
  | { type: 'MULLIGAN'; keepHand: boolean }
  | { type: 'EXTRA_DRAW' }
  | { type: 'SKIP_EXTRA_DRAW' }
  | { type: 'MOVE_TO_FRONT'; instanceIds: string[] }
  | { type: 'STEP_TO_ENERGY'; instanceId: string }
  | { type: 'PLAY_CARD'; cardInstanceId: string; targetLine: 'frontLine' | 'energyLine'; replaceInstanceId?: string }
  | { type: 'RAID'; cardInstanceId: string; targetInstanceId: string; moveToFront: boolean }
  | { type: 'DECLARE_ATTACK'; attackerInstanceId: string }
  | { type: 'BLOCK'; blockerInstanceId: string }
  | { type: 'TAKE_DAMAGE' }
  | { type: 'SNIPE_TARGET'; targetInstanceId: string }
  | { type: 'END_PHASE' }
  | { type: 'DISCARD'; cardInstanceIds: string[] }
  | { type: 'CHOOSE_SPECIAL_TARGET'; cardInstanceId: string }
  | { type: 'CHOOSE_COLOR_TARGET'; cardInstanceId: string }
  | { type: 'CHOOSE_ACTIVE_TARGET'; cardInstanceId: string }
  | { type: 'CHOOSE_RAID_TRIGGER_TARGET'; targetInstanceId: string; moveToFront: boolean }
  | { type: 'SKIP_TRIGGER' }
  | { type: 'FLIP_LIFE_CARD'; lifeIndex: number }
  | { type: 'CONCEDE' };

// --- Game Events (server → clients) ---

export type GameEvent =
  | { type: 'GAME_STARTED'; gameId: string }
  | { type: 'PHASE_CHANGED'; phase: Phase; activePlayer: PlayerKey; turn: number }
  | { type: 'CARD_DRAWN'; player: PlayerKey; card?: CardInstance }
  | { type: 'EXTRA_DRAW_USED'; player: PlayerKey }
  | { type: 'CARDS_MOVED_TO_FRONT'; player: PlayerKey; instanceIds: string[] }
  | { type: 'CARD_STEPPED_TO_ENERGY'; player: PlayerKey; instanceId: string }
  | { type: 'CARD_PLAYED'; player: PlayerKey; card: CardInstance; targetLine: string; replacedCard?: CardInstance }
  | { type: 'RAID_PLAYED'; player: PlayerKey; raidCard: CardInstance; targetCard: CardInstance; movedToFront: boolean }
  | { type: 'ATTACK_DECLARED'; attackerInstanceId: string; attackerPlayer: PlayerKey }
  | { type: 'BLOCK_DECLARED'; blockerInstanceId: string; blockerPlayer: PlayerKey }
  | { type: 'BATTLE_RESULT'; attackerInstanceId: string; blockerInstanceId: string; blockerRetired: boolean }
  | { type: 'DAMAGE_TAKEN'; player: PlayerKey; count: number; triggerChecks: TriggerCheckResult[] }
  | { type: 'TRIGGER_RESOLVED'; triggerType: string; card: CardInstance; description: string }
  | { type: 'CHARACTER_RETIRED'; player: PlayerKey; instanceId: string; toSideline: boolean }
  | { type: 'HAND_DISCARDED'; player: PlayerKey; count: number }
  | { type: 'AP_CHANGED'; player: PlayerKey; apStates: APState[] }
  | { type: 'CARDS_ACTIVATED'; player: PlayerKey }
  | { type: 'GAME_OVER'; winner: PlayerKey; reason: string }
  | { type: 'WAITING_FOR'; action: PendingAction }
  | { type: 'MULLIGAN_RESULT'; player: PlayerKey; kept: boolean; newHandSize: number }
  | { type: 'CARD_REMOVED_FROM_LINE'; player: PlayerKey; instanceId: string; line: string }
  | { type: 'STATE_SYNC'; state: SanitizedGameState }
  | { type: 'ERROR'; message: string };

export interface TriggerCheckResult {
  card: CardInstance;
  triggerType: string | null;
  resolved: boolean;
  description: string;
}

export interface ActionLogEntry {
  turn: number;
  phase: Phase;
  player: PlayerKey;
  action: string;
  timestamp: number;
}

// --- Sanitized State (what clients see) ---

export interface SanitizedGameState {
  id: string;
  turn: number;
  phase: Phase;
  activePlayer: PlayerKey;
  firstPlayer: PlayerKey;
  firstTurnOfGame: boolean;
  winner: PlayerKey | null;
  winReason: string | null;

  you: SanitizedPlayerState;
  opponent: SanitizedPlayerState;
  yourKey: PlayerKey;

  pendingAction: PendingAction | null;
  actionLog: ActionLogEntry[];
}

export interface LifeCardState {
  index: number;
  faceDown: boolean;
  cardNumber?: string;  // only revealed when flipped
}

export interface SanitizedPlayerState {
  id: string;
  deckCount: number;
  hand: CardInstance[];        // only your own hand is populated; opponent = []
  handCount: number;
  lifeCount: number;
  lifeCards: LifeCardState[];  // visual representation of life area
  frontLine: FieldCard[];
  energyLine: FieldCard[];
  sidelineArea: CardInstance[];
  removeArea: CardInstance[];
  ap: APState[];
  extraDrawUsed: boolean;
}

// --- Parsed Keywords ---

export interface ParsedKeywords {
  impact: number;       // 0 = no impact, 1+ = impact value
  damage: number;       // 0 = normal (1 trigger check), 2+ = Damage X
  step: boolean;
  doubleAttack: boolean;
  doubleBlock: boolean;
  snipe: boolean;
  nullifyImpact: boolean;
  raid: string | null;  // target affinity/name requirement, or null
}

// --- WebSocket Messages ---

export interface ClientMessage {
  type: 'CREATE_ROOM' | 'JOIN_ROOM' | 'SET_DECK' | 'READY' | 'ACTION';
  roomCode?: string;
  deckCards?: string[];
  action?: PlayerAction;
  playerName?: string;
}

export interface ServerMessage {
  type: 'ROOM_CREATED' | 'ROOM_JOINED' | 'PLAYER_JOINED' | 'PLAYER_READY' |
        'GAME_EVENT' | 'ERROR' | 'ROOM_CLOSED' | 'PLAYER_DISCONNECTED' | 'PLAYER_RECONNECTED';
  roomCode?: string;
  playerId?: string;
  playerName?: string;
  event?: GameEvent;
  error?: string;
}

// --- Room Types ---

export type RoomStatus = 'WAITING' | 'DECK_SELECT' | 'READY_CHECK' | 'IN_GAME' | 'FINISHED';

export interface RoomState {
  code: string;
  status: RoomStatus;
  player1: RoomPlayer | null;
  player2: RoomPlayer | null;
  gameState: GameState | null;
  createdAt: number;
  lastActivity: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  deckCards: string[] | null;
  ready: boolean;
  connected: boolean;
}
