// Client-side game types (mirrors server types for WebSocket communication)

export type Phase = 'SETUP' | 'MULLIGAN' | 'START' | 'MOVEMENT' | 'MAIN' | 'ATTACK' | 'END';
export type PlayerKey = 'player1' | 'player2';

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
  stayRested: number;
}

export interface Modifier {
  type: 'BP_CHANGE';
  value: number;
  expiresAt: 'END_OF_TURN' | 'END_OF_ATTACK' | 'PERMANENT';
}

export interface APState {
  active: boolean;
}

export interface LifeCardState {
  index: number;
  faceDown: boolean;
  cardNumber?: string;
}

export interface SanitizedPlayerState {
  id: string;
  deckCount: number;
  hand: CardInstance[];
  handCount: number;
  lifeCount: number;
  lifeCards: LifeCardState[];
  frontLine: FieldCard[];
  energyLine: FieldCard[];
  sidelineArea: CardInstance[];
  removeArea: CardInstance[];
  ap: APState[];
  extraDrawUsed: boolean;
}

export interface PendingAction {
  type: string;
  player: PlayerKey;
  count?: number;
  line?: string;
  reason?: string;
  attackerInstanceId?: string;
  attackerPlayer?: PlayerKey;
  color?: string;
  raidCard?: CardInstance;
  card?: CardInstance;
  damagedPlayer?: PlayerKey;
  damageRemaining?: number;
}

export interface ActionLogEntry {
  turn: number;
  phase: Phase;
  player: PlayerKey;
  action: string;
  timestamp: number;
}

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

export interface TriggerCheckResult {
  card: CardInstance;
  triggerType: string | null;
  resolved: boolean;
  description: string;
}

// Client → Server messages
export interface ClientMessage {
  type: 'CREATE_ROOM' | 'JOIN_ROOM' | 'SET_DECK' | 'READY' | 'ACTION';
  roomCode?: string;
  deckCards?: string[];
  action?: PlayerAction;
  playerName?: string;
}

// Server → Client messages
export interface ServerMessage {
  type: 'ROOM_CREATED' | 'ROOM_JOINED' | 'PLAYER_JOINED' | 'PLAYER_READY' |
        'GAME_EVENT' | 'ERROR' | 'ROOM_CLOSED' | 'PLAYER_DISCONNECTED' | 'PLAYER_RECONNECTED';
  roomCode?: string;
  playerId?: string;
  playerName?: string;
  event?: GameEvent;
  error?: string;
}

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

// Room connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type RoomPhase = 'lobby' | 'deck_select' | 'waiting_ready' | 'in_game' | 'finished';
