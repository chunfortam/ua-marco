import type {
  GameState, PlayerKey, PlayerAction, GameEvent, PlayerState,
  CardInstance, FieldCard, PendingAction, ActionLogEntry,
  SanitizedGameState, SanitizedPlayerState, LifeCardState,
} from './types.js';
import {
  getCardData, createCardInstance, createFieldCard, getOpponent,
  getPlayerState, shuffleArray, canPayEnergy, canPayAP, payAP,
  parseKeywords, parseTriggerType, cloneState, generateInstanceId,
} from './utils.js';

// ==========================================
// Game Creation
// ==========================================

export function createGame(
  gameId: string,
  player1Id: string,
  player2Id: string,
  deck1: string[],
  deck2: string[],
  seed: number,
): GameState {
  let counter = 0;

  // Create card instances for each deck
  const deck1Instances = deck1.map(cn => createCardInstance(cn));
  const deck2Instances = deck2.map(cn => createCardInstance(cn));

  // Shuffle decks
  const { result: shuffled1, nextCounter: c1 } = shuffleArray(deck1Instances, seed, counter);
  counter = c1;
  const { result: shuffled2, nextCounter: c2 } = shuffleArray(deck2Instances, seed, counter);
  counter = c2;

  // Draw opening hands (7 cards each per official rules)
  const hand1 = shuffled1.splice(0, 7);
  const hand2 = shuffled2.splice(0, 7);

  // Life area is set up AFTER mulligan (not here)
  // Each player places 7 cards face-down from top of deck after mulligan

  const state: GameState = {
    id: gameId,
    turn: 0,
    phase: 'MULLIGAN',
    activePlayer: 'player1',
    firstPlayer: 'player1',  // will be set after mulligan
    firstTurnOfGame: true,
    winner: null,
    winReason: null,

    player1: createPlayerState(player1Id, shuffled1, hand1, []),
    player2: createPlayerState(player2Id, shuffled2, hand2, []),

    pendingAction: { type: 'MULLIGAN_DECISION', player: 'player1' },
    actionLog: [],
    rngSeed: seed,
    rngCounter: counter,
  };

  return state;
}

function createPlayerState(
  id: string,
  deck: CardInstance[],
  hand: CardInstance[],
  life: CardInstance[],
): PlayerState {
  return {
    id,
    deck,
    hand,
    life,
    frontLine: [],
    energyLine: [],
    sidelineArea: [],
    removeArea: [],
    ap: [],  // AP cards are placed progressively during the game, not at start
    extraDrawUsed: false,
    mulliganDone: false,
    attackedThisPhase: [],
  };
}

// ==========================================
// Action Processing
// ==========================================

export function processAction(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
): { state: GameState; events: GameEvent[] } | { error: string } {
  const newState = cloneState(state);
  const events: GameEvent[] = [];

  // Concede is always valid
  if (action.type === 'CONCEDE') {
    const winner = getOpponent(player);
    newState.winner = winner;
    newState.winReason = `${player} conceded`;
    events.push({ type: 'GAME_OVER', winner, reason: `${player} conceded` });
    addLog(newState, player, 'Conceded');
    return { state: newState, events };
  }

  // Check if game is over
  if (newState.winner) {
    return { error: 'Game is already over' };
  }

  // Route to phase-specific handler
  switch (newState.phase) {
    case 'MULLIGAN':
      return processMulligan(newState, player, action, events);
    case 'START':
      return processStart(newState, player, action, events);
    case 'MOVEMENT':
      return processMovement(newState, player, action, events);
    case 'MAIN':
      return processMain(newState, player, action, events);
    case 'ATTACK':
      return processAttack(newState, player, action, events);
    case 'END':
      return processEnd(newState, player, action, events);
    default:
      return { error: `Unknown phase: ${newState.phase}` };
  }
}

// ==========================================
// Mulligan Phase
// ==========================================

function processMulligan(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  if (action.type !== 'MULLIGAN') {
    return { error: 'Expected MULLIGAN action during mulligan phase' };
  }

  const pending = state.pendingAction;
  if (!pending || pending.type !== 'MULLIGAN_DECISION' || pending.player !== player) {
    return { error: 'Not your turn to mulligan' };
  }

  const ps = getPlayerState(state, player);

  if (action.keepHand) {
    ps.mulliganDone = true;
    addLog(state, player, 'Kept opening hand');
    events.push({ type: 'MULLIGAN_RESULT', player, kept: true, newHandSize: ps.hand.length });
  } else {
    // Shuffle hand back into deck, then draw 7 new cards
    ps.deck.push(...ps.hand);
    ps.hand = [];
    const { result: shuffled, nextCounter } = shuffleArray(ps.deck, state.rngSeed, state.rngCounter);
    ps.deck = shuffled;
    state.rngCounter = nextCounter;
    ps.hand = ps.deck.splice(0, 7);
    ps.mulliganDone = true;
    addLog(state, player, 'Mulliganed hand');
    events.push({ type: 'MULLIGAN_RESULT', player, kept: false, newHandSize: ps.hand.length });
  }

  // Check if both players have completed mulligan
  if (state.player1.mulliganDone && state.player2.mulliganDone) {
    // Set up Life areas AFTER mulligan (7 cards each from top of deck)
    state.player1.life = state.player1.deck.splice(0, 7);
    state.player2.life = state.player2.deck.splice(0, 7);

    // Determine first player randomly
    const { result: order, nextCounter: nc } = shuffleArray(['player1', 'player2'] as PlayerKey[], state.rngSeed, state.rngCounter);
    state.rngCounter = nc;
    state.activePlayer = order[0];
    state.firstPlayer = order[0];  // remember who goes first
    state.turn = 1;
    state.pendingAction = null;

    // Begin Start Phase
    beginStartPhase(state, events);
  } else {
    // Other player needs to mulligan
    const otherPlayer = getOpponent(player);
    state.pendingAction = { type: 'MULLIGAN_DECISION', player: otherPlayer };
    events.push({ type: 'WAITING_FOR', action: state.pendingAction });
  }

  return { state, events };
}

// ==========================================
// Start Phase
// ==========================================

function beginStartPhase(state: GameState, events: GameEvent[]): void {
  const ps = getPlayerState(state, state.activePlayer);
  const isFirstPlayer = state.activePlayer === (state.turn === 1 ? state.activePlayer : state.activePlayer);

  state.phase = 'START';

  // Activate all characters
  for (const card of ps.frontLine) {
    card.active = true;
    card.attacksRemaining = parseKeywords(getCardData(card.cardNumber)).doubleAttack ? 2 : 1;
    card.blocksRemaining = parseKeywords(getCardData(card.cardNumber)).doubleBlock ? 2 : 1;
    card.usedOncePerTurn = [];
    card.tempModifiers = card.tempModifiers.filter(m => m.expiresAt === 'PERMANENT');
    card.currentBP = card.baseBP + card.tempModifiers.reduce((sum, m) => m.type === 'BP_CHANGE' ? sum + m.value : sum, 0);
  }
  for (const card of ps.energyLine) {
    card.active = true;
    card.usedOncePerTurn = [];
    card.tempModifiers = card.tempModifiers.filter(m => m.expiresAt === 'PERMANENT');
  }

  // Activate existing AP cards
  for (const ap of ps.ap) {
    ap.active = true;
  }

  ps.extraDrawUsed = false;
  ps.attackedThisPhase = [];

  // --- AP Placement ---
  // Player 1 (first): Turn 1 → 1 AP, Turn 2 → 2 AP, Turn 3+ → 3 AP (max)
  // Player 2 (second): Turn 1 → 2 AP, Turn 2 → 2 AP (no new), Turn 3+ → 3 AP (max)
  // Track using playerTurnNumber: how many turns THIS player has taken
  const playerTurnNumber = getPlayerTurnNumber(state);
  const isGoingFirst = isFirstGoingPlayer(state);

  if (isGoingFirst) {
    // P1: gets 1 new AP each turn until max 3
    if (ps.ap.length < 3) {
      ps.ap.push({ active: true });
    }
  } else {
    // P2: gets 2 AP on turn 1, 0 on turn 2, then 1 per turn until max 3
    if (playerTurnNumber === 1) {
      // First turn for P2: place 2 AP
      ps.ap.push({ active: true });
      ps.ap.push({ active: true });
    } else if (playerTurnNumber === 2) {
      // Second turn for P2: no new AP (already got one in advance)
    } else if (ps.ap.length < 3) {
      // Turn 3+: add 1 AP if below max
      ps.ap.push({ active: true });
    }
  }

  events.push({ type: 'CARDS_ACTIVATED', player: state.activePlayer });
  events.push({ type: 'AP_CHANGED', player: state.activePlayer, apStates: [...ps.ap] });
  events.push({ type: 'PHASE_CHANGED', phase: 'START', activePlayer: state.activePlayer, turn: state.turn });

  // --- Card Draw ---
  // Player 1 does NOT draw on their first turn
  // Player 2 DOES draw on their first turn
  // All other turns: draw 1 card
  const shouldDraw = !(isGoingFirst && playerTurnNumber === 1);

  if (shouldDraw) {
    if (ps.deck.length === 0) {
      const winner = getOpponent(state.activePlayer);
      state.winner = winner;
      state.winReason = 'Opponent decked out';
      events.push({ type: 'GAME_OVER', winner, reason: 'Opponent could not draw during Start Phase' });
      return;
    }

    const drawnCard = ps.deck.shift()!;
    ps.hand.push(drawnCard);
    events.push({ type: 'CARD_DRAWN', player: state.activePlayer, card: drawnCard });
    addLog(state, state.activePlayer, 'Drew a card');
  } else {
    addLog(state, state.activePlayer, 'First turn — no draw');
  }

  // Extra draw decision (can rest an AP to draw an extra card)
  // Only offer if player has at least 1 active AP
  const hasActiveAP = ps.ap.some(a => a.active);
  if (hasActiveAP && ps.deck.length > 0) {
    state.pendingAction = { type: 'EXTRA_DRAW_DECISION', player: state.activePlayer };
    events.push({ type: 'WAITING_FOR', action: state.pendingAction });
  } else {
    advanceToMovement(state, events);
  }
}

// Helper: is the current active player the one who goes first?
function isFirstGoingPlayer(state: GameState): boolean {
  return state.activePlayer === state.firstPlayer;
}

// Helper: get what turn number this is for the current active player
// Turn 1: first player plays (1st turn), then second player plays (1st turn)
// Turn 2: first player plays (2nd turn), then second player plays (2nd turn)
function getPlayerTurnNumber(state: GameState): number {
  return state.turn;
}

function processStart(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  if (player !== state.activePlayer) {
    return { error: 'Not your turn' };
  }

  if (action.type === 'EXTRA_DRAW') {
    const ps = getPlayerState(state, player);
    if (ps.extraDrawUsed) return { error: 'Extra draw already used this turn' };
    if (ps.deck.length === 0) return { error: 'No cards in deck to draw' };

    // Extra draw costs resting 1 AP card (not life)
    const activeAPIdx = ps.ap.findIndex(a => a.active);
    if (activeAPIdx === -1) return { error: 'No active AP to rest for extra draw' };

    // Rest the AP card
    ps.ap[activeAPIdx].active = false;
    events.push({ type: 'AP_CHANGED', player, apStates: [...ps.ap] });

    // Draw 1 card
    const drawnCard = ps.deck.shift()!;
    ps.hand.push(drawnCard);
    events.push({ type: 'CARD_DRAWN', player, card: drawnCard });

    ps.extraDrawUsed = true;
    addLog(state, player, 'Used Extra Draw (rested 1 AP)');

    // Advance to movement phase
    advanceToMovement(state, events);
    return { state, events };
  }

  if (action.type === 'SKIP_EXTRA_DRAW') {
    advanceToMovement(state, events);
    return { state, events };
  }

  return { error: `Invalid action ${action.type} during START phase` };
}

function advanceToMovement(state: GameState, events: GameEvent[]): void {
  state.phase = 'MOVEMENT';
  state.pendingAction = null;
  events.push({ type: 'PHASE_CHANGED', phase: 'MOVEMENT', activePlayer: state.activePlayer, turn: state.turn });
}

// ==========================================
// Movement Phase
// ==========================================

function processMovement(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  if (player !== state.activePlayer) {
    return { error: 'Not your turn' };
  }

  if (action.type === 'MOVE_TO_FRONT') {
    const ps = getPlayerState(state, player);
    const toMove: FieldCard[] = [];

    for (const id of action.instanceIds) {
      const idx = ps.energyLine.findIndex(c => c.instanceId === id && !c.isSite);
      if (idx === -1) return { error: `Card ${id} not found on energy line or is a site` };
      toMove.push(ps.energyLine[idx]);
    }

    // Check front line capacity
    const availableSlots = 4 - ps.frontLine.length;
    if (toMove.length > availableSlots) {
      return { error: `Not enough space on front line. Available: ${availableSlots}, trying to move: ${toMove.length}` };
    }

    // Move all at once
    for (const card of toMove) {
      const idx = ps.energyLine.findIndex(c => c.instanceId === card.instanceId);
      ps.energyLine.splice(idx, 1);
      ps.frontLine.push(card);
    }

    events.push({ type: 'CARDS_MOVED_TO_FRONT', player, instanceIds: action.instanceIds });
    addLog(state, player, `Moved ${toMove.length} character(s) to front line`);
    return { state, events };
  }

  if (action.type === 'STEP_TO_ENERGY') {
    const ps = getPlayerState(state, player);
    const idx = ps.frontLine.findIndex(c => c.instanceId === action.instanceId);
    if (idx === -1) return { error: 'Card not found on front line' };

    const card = ps.frontLine[idx];
    const keywords = parseKeywords(getCardData(card.cardNumber));
    if (!keywords.step) return { error: 'This character does not have STEP' };

    // Check energy line capacity (4 max, not counting sites)
    const nonSiteCount = ps.energyLine.filter(c => !c.isSite).length;
    if (nonSiteCount >= 4) {
      return { error: 'Energy line is full' };
    }

    ps.frontLine.splice(idx, 1);
    ps.energyLine.push(card);

    events.push({ type: 'CARD_STEPPED_TO_ENERGY', player, instanceId: action.instanceId });
    addLog(state, player, `Stepped ${getCardData(card.cardNumber)?.name || card.cardNumber} to energy line`);
    return { state, events };
  }

  if (action.type === 'END_PHASE') {
    state.phase = 'MAIN';
    state.pendingAction = null;
    events.push({ type: 'PHASE_CHANGED', phase: 'MAIN', activePlayer: state.activePlayer, turn: state.turn });
    return { state, events };
  }

  return { error: `Invalid action ${action.type} during MOVEMENT phase` };
}

// ==========================================
// Main Phase
// ==========================================

function processMain(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  if (player !== state.activePlayer) {
    return { error: 'Not your turn' };
  }

  if (action.type === 'PLAY_CARD') {
    return playCard(state, player, action, events);
  }

  if (action.type === 'RAID') {
    return playRaid(state, player, action, events);
  }

  if (action.type === 'END_PHASE') {
    state.phase = 'ATTACK';
    state.pendingAction = null;
    const ps = getPlayerState(state, player);
    ps.attackedThisPhase = [];
    events.push({ type: 'PHASE_CHANGED', phase: 'ATTACK', activePlayer: state.activePlayer, turn: state.turn });
    return { state, events };
  }

  return { error: `Invalid action ${action.type} during MAIN phase` };
}

function playCard(
  state: GameState,
  player: PlayerKey,
  action: Extract<PlayerAction, { type: 'PLAY_CARD' }>,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  const ps = getPlayerState(state, player);

  // Find card in hand
  const handIdx = ps.hand.findIndex(c => c.instanceId === action.cardInstanceId);
  if (handIdx === -1) return { error: 'Card not found in hand' };

  const cardInstance = ps.hand[handIdx];
  const cardData = getCardData(cardInstance.cardNumber);
  if (!cardData) return { error: 'Card data not found' };

  // Check if it's a Site card
  const isSite = cardData.cardType === 'Site';
  const isEvent = cardData.cardType === 'Event';
  const isCharacter = cardData.cardType === 'Character';

  // Check energy requirement
  if (!canPayEnergy(ps, cardInstance.cardNumber)) {
    return { error: 'Insufficient energy' };
  }

  // Check AP
  if (!canPayAP(ps, cardInstance.cardNumber)) {
    return { error: 'Insufficient AP' };
  }

  // Pay AP
  payAP(ps, cardInstance.cardNumber);
  events.push({ type: 'AP_CHANGED', player, apStates: [...ps.ap] });

  // Remove from hand
  ps.hand.splice(handIdx, 1);

  if (isEvent) {
    // Events go directly to remove area after play
    ps.removeArea.push(cardInstance);
    events.push({ type: 'CARD_PLAYED', player, card: cardInstance, targetLine: 'removeArea' });
    addLog(state, player, `Played event: ${cardData.name}`);
    return { state, events };
  }

  if (isSite) {
    // Sites go on energy line
    // If there's already a site, it goes to remove area
    const existingSiteIdx = ps.energyLine.findIndex(c => c.isSite);
    let replacedCard: CardInstance | undefined;
    if (existingSiteIdx !== -1) {
      const removed = ps.energyLine.splice(existingSiteIdx, 1)[0];
      ps.removeArea.push({ instanceId: removed.instanceId, cardNumber: removed.cardNumber });
      replacedCard = { instanceId: removed.instanceId, cardNumber: removed.cardNumber };
    }

    const fieldCard = createFieldCard(cardInstance.cardNumber, true);
    fieldCard.instanceId = cardInstance.instanceId;
    fieldCard.active = false;  // Cards are placed rested
    ps.energyLine.push(fieldCard);

    events.push({ type: 'CARD_PLAYED', player, card: cardInstance, targetLine: 'energyLine', replacedCard });
    addLog(state, player, `Played site: ${cardData.name}`);
    return { state, events };
  }

  // Character card
  const targetLine = action.targetLine;
  const line = ps[targetLine];

  // Check if we need to replace
  const nonSiteCards = line.filter(c => !c.isSite);
  let replacedCard: CardInstance | undefined;
  if (nonSiteCards.length >= 4) {
    if (!action.replaceInstanceId) {
      return { error: `${targetLine} is full. Must specify a card to replace.` };
    }
    const replaceIdx = line.findIndex(c => c.instanceId === action.replaceInstanceId && !c.isSite);
    if (replaceIdx === -1) return { error: 'Replacement card not found on line' };
    const removed = line.splice(replaceIdx, 1)[0];
    ps.removeArea.push({ instanceId: removed.instanceId, cardNumber: removed.cardNumber });
    replacedCard = { instanceId: removed.instanceId, cardNumber: removed.cardNumber };
    events.push({ type: 'CARD_REMOVED_FROM_LINE', player, instanceId: removed.instanceId, line: targetLine });
  }

  const fieldCard = createFieldCard(cardInstance.cardNumber);
  fieldCard.instanceId = cardInstance.instanceId;
  fieldCard.active = false;  // Cards are placed rested
  line.push(fieldCard);

  events.push({ type: 'CARD_PLAYED', player, card: cardInstance, targetLine, replacedCard });
  addLog(state, player, `Played ${cardData.name} to ${targetLine}`);
  return { state, events };
}

function playRaid(
  state: GameState,
  player: PlayerKey,
  action: Extract<PlayerAction, { type: 'RAID' }>,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  const ps = getPlayerState(state, player);

  // Find raid card in hand
  const handIdx = ps.hand.findIndex(c => c.instanceId === action.cardInstanceId);
  if (handIdx === -1) return { error: 'Raid card not found in hand' };

  const raidCardInstance = ps.hand[handIdx];
  const raidCardData = getCardData(raidCardInstance.cardNumber);
  if (!raidCardData) return { error: 'Card data not found' };

  // Find target on field
  let targetField: FieldCard | undefined;
  let targetLine: 'frontLine' | 'energyLine' | undefined;

  const frontIdx = ps.frontLine.findIndex(c => c.instanceId === action.targetInstanceId);
  if (frontIdx !== -1) {
    targetField = ps.frontLine[frontIdx];
    targetLine = 'frontLine';
  } else {
    const energyIdx = ps.energyLine.findIndex(c => c.instanceId === action.targetInstanceId && !c.isSite);
    if (energyIdx !== -1) {
      targetField = ps.energyLine[energyIdx];
      targetLine = 'energyLine';
    }
  }

  if (!targetField || !targetLine) return { error: 'Raid target not found on field' };

  // Check energy (raiding character inherits energy of underlying card)
  if (!canPayEnergy(ps, raidCardInstance.cardNumber)) {
    return { error: 'Insufficient energy for RAID' };
  }

  // Check AP
  if (!canPayAP(ps, raidCardInstance.cardNumber)) {
    return { error: 'Insufficient AP for RAID' };
  }

  // Pay AP
  payAP(ps, raidCardInstance.cardNumber);
  events.push({ type: 'AP_CHANGED', player, apStates: [...ps.ap] });

  // Remove from hand
  ps.hand.splice(handIdx, 1);

  // Create the raided card
  const raidFieldCard = createFieldCard(raidCardInstance.cardNumber);
  raidFieldCard.instanceId = raidCardInstance.instanceId;
  raidFieldCard.raidedOver = { instanceId: targetField.instanceId, cardNumber: targetField.cardNumber };
  raidFieldCard.active = false;  // RAID cards are also placed rested

  // Replace target with raid card
  const lineArr = ps[targetLine];
  const targetIdx = lineArr.findIndex(c => c.instanceId === action.targetInstanceId);
  lineArr[targetIdx] = raidFieldCard;

  // Optionally move to front line
  if (action.moveToFront && targetLine === 'energyLine') {
    const nonSiteCount = ps.frontLine.filter(c => !c.isSite).length;
    if (nonSiteCount < 4) {
      const moveIdx = ps.energyLine.findIndex(c => c.instanceId === raidFieldCard.instanceId);
      if (moveIdx !== -1) {
        ps.energyLine.splice(moveIdx, 1);
        ps.frontLine.push(raidFieldCard);
      }
    }
  }

  events.push({
    type: 'RAID_PLAYED',
    player,
    raidCard: raidCardInstance,
    targetCard: { instanceId: targetField.instanceId, cardNumber: targetField.cardNumber },
    movedToFront: action.moveToFront,
  });
  addLog(state, player, `RAID: ${raidCardData.name} onto ${getCardData(targetField.cardNumber)?.name || targetField.cardNumber}`);
  return { state, events };
}

// ==========================================
// Attack Phase
// ==========================================

function processAttack(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  // Handle pending life flip (attacker chooses)
  if (state.pendingAction?.type === 'CHOOSE_LIFE_TO_FLIP') {
    return processLifeFlip(state, player, action, events);
  }

  // Handle pending block decisions (defending player)
  if (state.pendingAction?.type === 'BLOCK_DECISION') {
    return processBlockDecision(state, player, action, events);
  }

  if (state.pendingAction?.type === 'SNIPE_CHOOSE') {
    return processSnipeChoice(state, player, action, events);
  }

  if (player !== state.activePlayer) {
    return { error: 'Not your turn' };
  }

  // First player cannot attack on their very first turn (turn 1)
  // But the second player CAN attack on turn 1
  if (state.turn === 1 && isFirstGoingPlayer(state)) {
    if (action.type === 'DECLARE_ATTACK') {
      return { error: 'First player cannot attack on the first turn' };
    }
  }

  if (action.type === 'DECLARE_ATTACK') {
    return declareAttack(state, player, action, events);
  }

  if (action.type === 'END_PHASE') {
    // Advance to END phase
    beginEndPhase(state, events);
    return { state, events };
  }

  return { error: `Invalid action ${action.type} during ATTACK phase` };
}

function declareAttack(
  state: GameState,
  player: PlayerKey,
  action: Extract<PlayerAction, { type: 'DECLARE_ATTACK' }>,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  const ps = getPlayerState(state, player);
  const attackerIdx = ps.frontLine.findIndex(c => c.instanceId === action.attackerInstanceId);
  if (attackerIdx === -1) return { error: 'Attacker not found on front line' };

  const attacker = ps.frontLine[attackerIdx];
  if (!attacker.active) return { error: 'Attacker is resting (not active)' };
  if (attacker.attacksRemaining <= 0) return { error: 'No attacks remaining for this character' };
  if (attacker.isSite) return { error: 'Sites cannot attack' };

  // Rest the attacker
  attacker.active = false;
  attacker.attacksRemaining--;

  events.push({ type: 'ATTACK_DECLARED', attackerInstanceId: attacker.instanceId, attackerPlayer: player });
  addLog(state, player, `${getCardData(attacker.cardNumber)?.name || attacker.cardNumber} attacks!`);

  // Check for Snipe
  const keywords = parseKeywords(getCardData(attacker.cardNumber));
  if (keywords.snipe) {
    const opponent = getOpponent(player);
    state.pendingAction = { type: 'SNIPE_CHOOSE', player, attackerInstanceId: attacker.instanceId };
    events.push({ type: 'WAITING_FOR', action: state.pendingAction });
    return { state, events };
  }

  // Wait for opponent's block decision
  const opponent = getOpponent(player);
  state.pendingAction = {
    type: 'BLOCK_DECISION',
    player: opponent,
    attackerInstanceId: attacker.instanceId,
    attackerPlayer: player,
  };
  events.push({ type: 'WAITING_FOR', action: state.pendingAction });

  return { state, events };
}

function processSnipeChoice(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  if (action.type !== 'SNIPE_TARGET') {
    return { error: 'Expected SNIPE_TARGET action' };
  }

  const pending = state.pendingAction as Extract<PendingAction, { type: 'SNIPE_CHOOSE' }>;
  if (player !== pending.player) return { error: 'Not your turn to choose snipe target' };

  const opponent = getOpponent(player);
  const oppState = getPlayerState(state, opponent);
  const targetIdx = oppState.frontLine.findIndex(c => c.instanceId === action.targetInstanceId);
  if (targetIdx === -1) return { error: 'Snipe target not found on opponent front line' };

  const target = oppState.frontLine[targetIdx];
  if (!target.active) return { error: 'Target is resting, cannot be forced to block' };

  // Force the target to block
  const attackerPlayer = player;
  const ps = getPlayerState(state, attackerPlayer);
  const attacker = ps.frontLine.find(c => c.instanceId === pending.attackerInstanceId);
  if (!attacker) return { error: 'Attacker not found' };

  // Resolve battle directly
  return resolveBattle(state, attackerPlayer, attacker, opponent, target, events);
}

function processBlockDecision(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  const pending = state.pendingAction as Extract<PendingAction, { type: 'BLOCK_DECISION' }>;
  if (player !== pending.player) return { error: 'Not your turn to block' };

  if (action.type === 'BLOCK') {
    const ps = getPlayerState(state, player);
    const blockerIdx = ps.frontLine.findIndex(c => c.instanceId === action.blockerInstanceId);
    if (blockerIdx === -1) return { error: 'Blocker not found on front line' };

    const blocker = ps.frontLine[blockerIdx];
    if (!blocker.active) return { error: 'Blocker is resting' };
    if (blocker.blocksRemaining <= 0) return { error: 'No blocks remaining for this character' };
    if (blocker.isSite) return { error: 'Sites cannot block' };

    // Rest the blocker
    blocker.active = false;
    blocker.blocksRemaining--;

    events.push({ type: 'BLOCK_DECLARED', blockerInstanceId: blocker.instanceId, blockerPlayer: player });
    addLog(state, player, `${getCardData(blocker.cardNumber)?.name || blocker.cardNumber} blocks!`);

    // Resolve battle
    const attackerPlayer = pending.attackerPlayer;
    const attackerPS = getPlayerState(state, attackerPlayer);
    const attacker = attackerPS.frontLine.find(c => c.instanceId === pending.attackerInstanceId);
    if (!attacker) return { error: 'Attacker no longer on field' };

    return resolveBattle(state, attackerPlayer, attacker, player, blocker, events);
  }

  if (action.type === 'TAKE_DAMAGE') {
    // Resolve damage to defending player
    const attackerPlayer = pending.attackerPlayer;
    const attackerPS = getPlayerState(state, attackerPlayer);
    const attacker = attackerPS.frontLine.find(c => c.instanceId === pending.attackerInstanceId);
    if (!attacker) return { error: 'Attacker no longer on field' };

    return resolveDamage(state, player, attacker, attackerPlayer, events);
  }

  return { error: `Invalid action ${action.type} during block decision` };
}

function resolveBattle(
  state: GameState,
  attackerPlayer: PlayerKey,
  attacker: FieldCard,
  blockerPlayer: PlayerKey,
  blocker: FieldCard,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } {
  const attackerBP = attacker.currentBP;
  const blockerBP = blocker.currentBP;

  // Attacker wins ties
  const blockerRetired = attackerBP >= blockerBP;

  events.push({
    type: 'BATTLE_RESULT',
    attackerInstanceId: attacker.instanceId,
    blockerInstanceId: blocker.instanceId,
    blockerRetired,
  });

  if (blockerRetired) {
    // Retire blocker to sideline area
    const blockerPS = getPlayerState(state, blockerPlayer);
    const idx = blockerPS.frontLine.findIndex(c => c.instanceId === blocker.instanceId);
    if (idx !== -1) {
      blockerPS.frontLine.splice(idx, 1);
      blockerPS.sidelineArea.push({ instanceId: blocker.instanceId, cardNumber: blocker.cardNumber });
      events.push({ type: 'CHARACTER_RETIRED', player: blockerPlayer, instanceId: blocker.instanceId, toSideline: true });
      addLog(state, blockerPlayer, `${getCardData(blocker.cardNumber)?.name || blocker.cardNumber} was retired (sidelined)`);
    }
  } else {
    addLog(state, blockerPlayer, `${getCardData(blocker.cardNumber)?.name || blocker.cardNumber} survived the attack`);
  }

  // Clear pending action, attacker can continue attacking
  state.pendingAction = null;

  // Check for double attack — if attacker has attacks remaining, set back to active
  if (attacker.attacksRemaining > 0) {
    attacker.active = true;
  }

  return { state, events };
}

function resolveDamage(
  state: GameState,
  damagedPlayer: PlayerKey,
  attacker: FieldCard,
  attackerPlayer: PlayerKey,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } {
  const ps = getPlayerState(state, damagedPlayer);
  const keywords = parseKeywords(getCardData(attacker.cardNumber));

  // Calculate total damage
  let totalDamage = 1;
  if (keywords.damage > 0) {
    totalDamage = keywords.damage;
  }
  if (keywords.impact > 0) {
    totalDamage += keywords.impact;
  }

  if (ps.life.length === 0) {
    const winner = getOpponent(damagedPlayer);
    state.winner = winner;
    state.winReason = 'Opponent life reduced to 0';
    events.push({ type: 'GAME_OVER', winner, reason: 'Life reduced to 0' });
    return { state, events };
  }

  // Attacker chooses which life card to flip
  state.pendingAction = {
    type: 'CHOOSE_LIFE_TO_FLIP',
    player: attackerPlayer,
    damagedPlayer,
    attackerInstanceId: attacker.instanceId,
    attackerPlayer,
    damageRemaining: totalDamage,
  };
  events.push({ type: 'WAITING_FOR', action: state.pendingAction });
  addLog(state, damagedPlayer, `Taking ${totalDamage} damage — opponent choosing life card to flip`);

  return { state, events };
}

function processLifeFlip(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  if (action.type !== 'FLIP_LIFE_CARD') {
    return { error: 'Expected FLIP_LIFE_CARD action' };
  }

  const pending = state.pendingAction as Extract<PendingAction, { type: 'CHOOSE_LIFE_TO_FLIP' }>;
  if (player !== pending.player) return { error: 'Not your turn to flip life card' };

  const damagedPlayer = pending.damagedPlayer as PlayerKey;
  const ps = getPlayerState(state, damagedPlayer);

  if (action.lifeIndex < 0 || action.lifeIndex >= ps.life.length) {
    return { error: `Invalid life card index: ${action.lifeIndex}` };
  }

  // Remove the chosen life card
  const lifeCard = ps.life.splice(action.lifeIndex, 1)[0];
  const cardData = getCardData(lifeCard.cardNumber);
  const triggerType = parseTriggerType(cardData);

  const triggerCheck = {
    card: lifeCard,
    triggerType,
    resolved: false,
    description: triggerType ? `Trigger: ${triggerType}` : 'No trigger',
  };

  events.push({
    type: 'DAMAGE_TAKEN',
    player: damagedPlayer,
    count: 1,
    triggerChecks: [triggerCheck],
  });

  // Process the trigger for this card
  resolveLifeTrigger(state, damagedPlayer, triggerCheck, events);

  const damageRemaining = pending.damageRemaining - 1;

  // Check win condition
  if (ps.life.length === 0) {
    // Check for FINAL trigger
    if (triggerType === 'FINAL' && ps.deck.length > 0) {
      const finalCard = ps.deck.shift()!;
      ps.life.push(finalCard);
      triggerCheck.resolved = true;
      triggerCheck.description = 'FINAL: Placed 1 card from deck to life, survived!';
      events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'FINAL', card: lifeCard, description: triggerCheck.description });
    } else {
      const winner = getOpponent(damagedPlayer);
      state.winner = winner;
      state.winReason = 'Opponent life reduced to 0';
      events.push({ type: 'GAME_OVER', winner, reason: 'Life reduced to 0' });
      return { state, events };
    }
  }

  // More damage remaining? Prompt for next flip
  if (damageRemaining > 0 && ps.life.length > 0) {
    state.pendingAction = {
      type: 'CHOOSE_LIFE_TO_FLIP',
      player: pending.attackerPlayer,
      damagedPlayer,
      attackerInstanceId: pending.attackerInstanceId,
      attackerPlayer: pending.attackerPlayer,
      damageRemaining,
    };
    events.push({ type: 'WAITING_FOR', action: state.pendingAction });
  } else {
    state.pendingAction = null;
    // Check for double attack
    const attackerPS = getPlayerState(state, pending.attackerPlayer);
    const attacker2 = attackerPS.frontLine.find(c => c.instanceId === pending.attackerInstanceId);
    if (attacker2 && attacker2.attacksRemaining > 0) {
      attacker2.active = true;
    }
  }

  return { state, events };
}

function resolveLifeTrigger(
  state: GameState,
  damagedPlayer: PlayerKey,
  check: { card: CardInstance; triggerType: string | null; resolved: boolean; description: string },
  events: GameEvent[],
): void {
  const ps = getPlayerState(state, damagedPlayer);

  if (!check.triggerType) {
    ps.removeArea.push(check.card);
    check.resolved = true;
    return;
  }

  switch (check.triggerType) {
    case 'GET':
      ps.hand.push(check.card);
      check.resolved = true;
      check.description = `GET: ${getCardData(check.card.cardNumber)?.name} added to hand`;
      events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'GET', card: check.card, description: check.description });
      break;

    case 'DRAW':
      ps.removeArea.push(check.card);
      if (ps.deck.length > 0) {
        const drawn = ps.deck.shift()!;
        ps.hand.push(drawn);
        events.push({ type: 'CARD_DRAWN', player: damagedPlayer, card: drawn });
      }
      check.resolved = true;
      check.description = 'DRAW: Drew 1 card';
      events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'DRAW', card: check.card, description: check.description });
      break;

    case 'ACTIVE': {
      ps.removeArea.push(check.card);
      const restingChars = [...ps.frontLine, ...ps.energyLine].filter(c => !c.active && !c.isSite);
      if (restingChars.length === 1) {
        restingChars[0].active = true;
        check.resolved = true;
        check.description = `ACTIVE: Set ${getCardData(restingChars[0].cardNumber)?.name} to active`;
        events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'ACTIVE', card: check.card, description: check.description });
      } else if (restingChars.length === 0) {
        check.resolved = true;
        check.description = 'ACTIVE: No resting characters to activate';
        events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'ACTIVE', card: check.card, description: check.description });
      } else {
        state.pendingAction = { type: 'ACTIVE_TRIGGER_CHOOSE', player: damagedPlayer };
        check.description = 'ACTIVE: Choose a resting character to set to active';
        events.push({ type: 'WAITING_FOR', action: state.pendingAction });
      }
      break;
    }

    case 'SPECIAL':
      ps.removeArea.push(check.card);
      if (ps.removeArea.length > 0) {
        state.pendingAction = { type: 'SPECIAL_TRIGGER_CHOOSE', player: damagedPlayer };
        check.description = 'SPECIAL: Choose a card from remove area to return to hand';
        events.push({ type: 'WAITING_FOR', action: state.pendingAction });
      } else {
        check.resolved = true;
        check.description = 'SPECIAL: No cards in remove area';
        events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'SPECIAL', card: check.card, description: check.description });
      }
      break;

    case 'COLOR': {
      ps.removeArea.push(check.card);
      const triggerColor = getCardData(check.card.cardNumber)?.requiredEnergyColor;
      if (triggerColor) {
        const eligibleInSideline = ps.sidelineArea.filter(c => {
          const cd = getCardData(c.cardNumber);
          return cd?.cardType === 'Character' &&
            cd.requiredEnergyColor === triggerColor &&
            (cd.requiredEnergyCount ?? 0) <= 2 &&
            (typeof cd.apCost === 'number' ? cd.apCost : parseInt(String(cd.apCost)) || 0) <= 1;
        });
        if (eligibleInSideline.length > 0) {
          state.pendingAction = { type: 'COLOR_TRIGGER_CHOOSE', player: damagedPlayer, color: triggerColor };
          check.description = `COLOR: Choose a ${triggerColor} character to play from sideline`;
          events.push({ type: 'WAITING_FOR', action: state.pendingAction });
        } else {
          check.resolved = true;
          check.description = 'COLOR: No eligible characters in sideline';
          events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'COLOR', card: check.card, description: check.description });
        }
      } else {
        check.resolved = true;
      }
      break;
    }

    case 'FINAL':
      // FINAL is handled after the flip in processLifeFlip
      ps.removeArea.push(check.card);
      check.description = 'FINAL: Will activate if life reaches 0';
      break;

    case 'RAID':
      ps.removeArea.push(check.card);
      check.resolved = true;
      check.description = 'RAID trigger: Card can be played as RAID (manual resolution)';
      events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'RAID', card: check.card, description: check.description });
      break;

    default:
      ps.removeArea.push(check.card);
      check.resolved = true;
  }
}

// ==========================================
// End Phase
// ==========================================

function beginEndPhase(state: GameState, events: GameEvent[]): void {
  state.phase = 'END';
  const ps = getPlayerState(state, state.activePlayer);

  events.push({ type: 'PHASE_CHANGED', phase: 'END', activePlayer: state.activePlayer, turn: state.turn });

  // Discard down to 8 cards
  if (ps.hand.length > 8) {
    const discardCount = ps.hand.length - 8;
    state.pendingAction = { type: 'CHOOSE_DISCARD', player: state.activePlayer, count: discardCount };
    events.push({ type: 'WAITING_FOR', action: state.pendingAction });
    return;
  }

  // No discard needed, end turn
  finishEndPhase(state, events);
}

function processEnd(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  if (action.type === 'DISCARD') {
    const pending = state.pendingAction;
    if (!pending || pending.type !== 'CHOOSE_DISCARD' || pending.player !== player) {
      return { error: 'Not expecting discard from you' };
    }

    const ps = getPlayerState(state, player);
    if (action.cardInstanceIds.length !== pending.count) {
      return { error: `Must discard exactly ${pending.count} cards` };
    }

    for (const id of action.cardInstanceIds) {
      const idx = ps.hand.findIndex(c => c.instanceId === id);
      if (idx === -1) return { error: `Card ${id} not found in hand` };
      const removed = ps.hand.splice(idx, 1)[0];
      ps.removeArea.push(removed);
    }

    events.push({ type: 'HAND_DISCARDED', player, count: action.cardInstanceIds.length });
    addLog(state, player, `Discarded ${action.cardInstanceIds.length} card(s)`);

    finishEndPhase(state, events);
    return { state, events };
  }

  return { error: `Invalid action ${action.type} during END phase` };
}

function finishEndPhase(state: GameState, events: GameEvent[]): void {
  const ps = getPlayerState(state, state.activePlayer);

  // Clean up temp modifiers that expire at end of turn
  for (const card of [...ps.frontLine, ...ps.energyLine]) {
    card.tempModifiers = card.tempModifiers.filter(m => m.expiresAt !== 'END_OF_TURN');
    card.currentBP = card.baseBP + card.tempModifiers.reduce((sum, m) => m.type === 'BP_CHANGE' ? sum + m.value : sum, 0);
  }

  // Switch active player
  state.activePlayer = getOpponent(state.activePlayer);

  // Track turn number: increments when it comes back to the first player
  if (state.activePlayer === state.firstPlayer) {
    state.turn++;
    // After both players have completed turn 1, no longer first turn of game
    if (state.firstTurnOfGame) {
      state.firstTurnOfGame = false;
    }
  }

  state.pendingAction = null;

  // Begin next player's start phase
  beginStartPhase(state, events);
}

// ==========================================
// Trigger Resolution Actions
// ==========================================

export function processTrigggerAction(
  state: GameState,
  player: PlayerKey,
  action: PlayerAction,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } | { error: string } {
  const pending = state.pendingAction;
  if (!pending) return { error: 'No pending action' };

  if (pending.type === 'SPECIAL_TRIGGER_CHOOSE' && action.type === 'CHOOSE_SPECIAL_TARGET') {
    const ps = getPlayerState(state, player);
    const idx = ps.removeArea.findIndex(c => c.instanceId === action.cardInstanceId);
    if (idx === -1) return { error: 'Card not found in remove area' };
    const card = ps.removeArea.splice(idx, 1)[0];
    ps.hand.push(card);
    events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'SPECIAL', card, description: `Returned ${getCardData(card.cardNumber)?.name} to hand` });
    state.pendingAction = null;
    return { state, events };
  }

  if (pending.type === 'COLOR_TRIGGER_CHOOSE' && action.type === 'CHOOSE_COLOR_TARGET') {
    const ps = getPlayerState(state, player);
    const idx = ps.sidelineArea.findIndex(c => c.instanceId === action.cardInstanceId);
    if (idx === -1) return { error: 'Card not found in sideline area' };
    const card = ps.sidelineArea.splice(idx, 1)[0];

    // Play to front line, active
    const nonSiteCount = ps.frontLine.filter(c => !c.isSite).length;
    if (nonSiteCount >= 4) {
      return { error: 'Front line is full' };
    }

    const fieldCard = createFieldCard(card.cardNumber);
    fieldCard.instanceId = card.instanceId;
    fieldCard.active = true;
    ps.frontLine.push(fieldCard);

    events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'COLOR', card, description: `Played ${getCardData(card.cardNumber)?.name} from sideline to front line` });
    state.pendingAction = null;
    return { state, events };
  }

  if (pending.type === 'ACTIVE_TRIGGER_CHOOSE' && action.type === 'CHOOSE_ACTIVE_TARGET') {
    const ps = getPlayerState(state, player);
    const allCards = [...ps.frontLine, ...ps.energyLine];
    const target = allCards.find(c => c.instanceId === action.cardInstanceId && !c.active);
    if (!target) return { error: 'Target not found or already active' };
    target.active = true;
    events.push({ type: 'TRIGGER_RESOLVED', triggerType: 'ACTIVE', card: { instanceId: target.instanceId, cardNumber: target.cardNumber }, description: `Set ${getCardData(target.cardNumber)?.name} to active` });
    state.pendingAction = null;
    return { state, events };
  }

  if (action.type === 'SKIP_TRIGGER') {
    state.pendingAction = null;
    return { state, events };
  }

  return { error: 'Invalid trigger resolution action' };
}

// ==========================================
// Sanitization (for sending to clients)
// ==========================================

export function sanitizeForPlayer(state: GameState, playerKey: PlayerKey): SanitizedGameState {
  const you = state[playerKey];
  const opponentKey = getOpponent(playerKey);
  const opponent = state[opponentKey];

  return {
    id: state.id,
    turn: state.turn,
    phase: state.phase,
    activePlayer: state.activePlayer,
    firstPlayer: state.firstPlayer,
    firstTurnOfGame: state.firstTurnOfGame,
    winner: state.winner,
    winReason: state.winReason,

    you: sanitizePlayerState(you, true),
    opponent: sanitizePlayerState(opponent, false),
    yourKey: playerKey,

    pendingAction: state.pendingAction,
    actionLog: state.actionLog.slice(-50),
  };
}

function sanitizePlayerState(ps: PlayerState, isYou: boolean): SanitizedPlayerState {
  // Life cards: all face-down (card identity hidden)
  const lifeCards: LifeCardState[] = ps.life.map((_, i) => ({
    index: i,
    faceDown: true,
  }));

  return {
    id: ps.id,
    deckCount: ps.deck.length,
    hand: isYou ? [...ps.hand] : [],
    handCount: ps.hand.length,
    lifeCount: ps.life.length,
    lifeCards,
    frontLine: ps.frontLine.map(c => ({ ...c })),
    energyLine: ps.energyLine.map(c => ({ ...c })),
    sidelineArea: [...ps.sidelineArea],
    removeArea: [...ps.removeArea],
    ap: [...ps.ap],
    extraDrawUsed: ps.extraDrawUsed,
  };
}

// ==========================================
// Valid Actions
// ==========================================

export function getValidActions(state: GameState, playerKey: PlayerKey): PlayerAction[] {
  const actions: PlayerAction[] = [{ type: 'CONCEDE' }];

  if (state.winner) return actions;

  const ps = getPlayerState(state, playerKey);
  const pending = state.pendingAction;

  // Handle pending actions
  if (pending) {
    if (pending.player !== playerKey) return actions;

    switch (pending.type) {
      case 'MULLIGAN_DECISION':
        actions.push({ type: 'MULLIGAN', keepHand: true });
        actions.push({ type: 'MULLIGAN', keepHand: false });
        return actions;

      case 'EXTRA_DRAW_DECISION':
        if (ps.ap.some(a => a.active) && ps.deck.length > 0) {
          actions.push({ type: 'EXTRA_DRAW' });
        }
        actions.push({ type: 'SKIP_EXTRA_DRAW' });
        return actions;

      case 'BLOCK_DECISION':
        for (const card of ps.frontLine) {
          if (card.active && card.blocksRemaining > 0 && !card.isSite) {
            actions.push({ type: 'BLOCK', blockerInstanceId: card.instanceId });
          }
        }
        actions.push({ type: 'TAKE_DAMAGE' });
        return actions;

      case 'CHOOSE_DISCARD':
        // Player needs to discard — any combination of hand cards
        actions.push({ type: 'DISCARD', cardInstanceIds: [] }); // placeholder
        return actions;

      case 'SPECIAL_TRIGGER_CHOOSE':
        for (const card of ps.removeArea) {
          actions.push({ type: 'CHOOSE_SPECIAL_TARGET', cardInstanceId: card.instanceId });
        }
        actions.push({ type: 'SKIP_TRIGGER' });
        return actions;

      case 'COLOR_TRIGGER_CHOOSE':
        for (const card of ps.sidelineArea) {
          const cd = getCardData(card.cardNumber);
          if (cd?.cardType === 'Character' &&
              cd.requiredEnergyColor === pending.color &&
              (cd.requiredEnergyCount ?? 0) <= 2) {
            actions.push({ type: 'CHOOSE_COLOR_TARGET', cardInstanceId: card.instanceId });
          }
        }
        actions.push({ type: 'SKIP_TRIGGER' });
        return actions;

      case 'ACTIVE_TRIGGER_CHOOSE':
        for (const card of [...ps.frontLine, ...ps.energyLine]) {
          if (!card.active && !card.isSite) {
            actions.push({ type: 'CHOOSE_ACTIVE_TARGET', cardInstanceId: card.instanceId });
          }
        }
        actions.push({ type: 'SKIP_TRIGGER' });
        return actions;

      case 'SNIPE_CHOOSE': {
        const opponent = getOpponent(playerKey);
        const oppState = getPlayerState(state, opponent);
        for (const card of oppState.frontLine) {
          if (card.active && !card.isSite) {
            actions.push({ type: 'SNIPE_TARGET', targetInstanceId: card.instanceId });
          }
        }
        return actions;
      }

      case 'CHOOSE_LIFE_TO_FLIP': {
        const damagedPlayerKey = pending.damagedPlayer as PlayerKey;
        const damagedPS = getPlayerState(state, damagedPlayerKey);
        for (let i = 0; i < damagedPS.life.length; i++) {
          actions.push({ type: 'FLIP_LIFE_CARD', lifeIndex: i });
        }
        return actions;
      }
    }
  }

  // Phase-specific actions (only for active player)
  if (playerKey !== state.activePlayer) return actions;

  switch (state.phase) {
    case 'MOVEMENT':
      // Move characters from energy to front
      for (const card of ps.energyLine) {
        if (!card.isSite) {
          actions.push({ type: 'MOVE_TO_FRONT', instanceIds: [card.instanceId] });
        }
      }
      // Step characters from front to energy
      for (const card of ps.frontLine) {
        const keywords = parseKeywords(getCardData(card.cardNumber));
        if (keywords.step && !card.isSite) {
          actions.push({ type: 'STEP_TO_ENERGY', instanceId: card.instanceId });
        }
      }
      actions.push({ type: 'END_PHASE' });
      break;

    case 'MAIN':
      // Play cards from hand
      for (const card of ps.hand) {
        const cd = getCardData(card.cardNumber);
        if (cd && canPayEnergy(ps, card.cardNumber) && canPayAP(ps, card.cardNumber)) {
          if (cd.cardType === 'Character') {
            actions.push({ type: 'PLAY_CARD', cardInstanceId: card.instanceId, targetLine: 'frontLine' });
            actions.push({ type: 'PLAY_CARD', cardInstanceId: card.instanceId, targetLine: 'energyLine' });
          } else if (cd.cardType === 'Event' || cd.cardType === 'Site') {
            actions.push({ type: 'PLAY_CARD', cardInstanceId: card.instanceId, targetLine: cd.cardType === 'Site' ? 'energyLine' : 'frontLine' });
          }
        }
      }
      actions.push({ type: 'END_PHASE' });
      break;

    case 'ATTACK':
      // First player cannot attack on turn 1; second player CAN
      if (!(state.turn === 1 && state.activePlayer === state.firstPlayer)) {
        for (const card of ps.frontLine) {
          if (card.active && card.attacksRemaining > 0 && !card.isSite) {
            actions.push({ type: 'DECLARE_ATTACK', attackerInstanceId: card.instanceId });
          }
        }
      }
      actions.push({ type: 'END_PHASE' });
      break;
  }

  return actions;
}

// ==========================================
// Helpers
// ==========================================

function addLog(state: GameState, player: PlayerKey, action: string): void {
  state.actionLog.push({
    turn: state.turn,
    phase: state.phase,
    player,
    action,
    timestamp: Date.now(),
  });
}
