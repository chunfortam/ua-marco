import type { RoomState, RoomPlayer, RoomStatus, GameState, PlayerKey, PlayerAction, GameEvent, ServerMessage } from '../engine/types.js';
import { createGame, processAction, processTrigggerAction, sanitizeForPlayer } from '../engine/game.js';
import type { WebSocket } from 'ws';

export class Room {
  state: RoomState;
  connections: Map<string, WebSocket> = new Map();

  constructor(code: string) {
    this.state = {
      code,
      status: 'WAITING',
      player1: null,
      player2: null,
      gameState: null,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
  }

  get isFull(): boolean {
    return this.state.player1 !== null && this.state.player2 !== null;
  }

  addPlayer(playerId: string, playerName: string, ws: WebSocket): PlayerKey | null {
    this.state.lastActivity = Date.now();

    if (!this.state.player1) {
      this.state.player1 = { id: playerId, name: playerName, deckCards: null, ready: false, connected: true };
      this.connections.set(playerId, ws);
      return 'player1';
    }
    if (!this.state.player2) {
      this.state.player2 = { id: playerId, name: playerName, deckCards: null, ready: false, connected: true };
      this.connections.set(playerId, ws);
      this.state.status = 'DECK_SELECT';
      return 'player2';
    }
    return null;
  }

  setDeck(playerId: string, deckCards: string[]): boolean {
    this.state.lastActivity = Date.now();
    const player = this.getPlayer(playerId);
    if (!player) return false;
    player.deckCards = deckCards;
    return true;
  }

  setReady(playerId: string): boolean {
    this.state.lastActivity = Date.now();
    const player = this.getPlayer(playerId);
    if (!player || !player.deckCards) return false;
    player.ready = true;

    // Check if both players are ready
    if (this.state.player1?.ready && this.state.player2?.ready) {
      this.startGame();
      return true;
    }
    return true;
  }

  startGame(): void {
    if (!this.state.player1?.deckCards || !this.state.player2?.deckCards) return;

    const seed = Date.now();
    this.state.gameState = createGame(
      this.state.code,
      this.state.player1.id,
      this.state.player2.id,
      this.state.player1.deckCards,
      this.state.player2.deckCards,
      seed,
    );
    this.state.status = 'IN_GAME';

    // Send initial state to both players
    this.broadcastGameState();
  }

  handleAction(playerId: string, action: PlayerAction): { events: GameEvent[] } | { error: string } {
    this.state.lastActivity = Date.now();
    if (!this.state.gameState) return { error: 'Game not started' };

    const playerKey = this.getPlayerKey(playerId);
    if (!playerKey) return { error: 'Player not in room' };

    // Check if this is a trigger resolution action
    const pending = this.state.gameState.pendingAction;
    if (pending && (
      action.type === 'CHOOSE_SPECIAL_TARGET' ||
      action.type === 'CHOOSE_COLOR_TARGET' ||
      action.type === 'CHOOSE_ACTIVE_TARGET' ||
      action.type === 'SKIP_TRIGGER'
    )) {
      const result = processTrigggerAction(this.state.gameState, playerKey, action, []);
      if ('error' in result) return result;
      this.state.gameState = result.state;
      this.broadcastGameState();
      return { events: result.events };
    }

    const result = processAction(this.state.gameState, playerKey, action);
    if ('error' in result) return result;

    this.state.gameState = result.state;

    if (result.state.winner) {
      this.state.status = 'FINISHED';
    }

    this.broadcastGameState();
    return { events: result.events };
  }

  broadcastGameState(): void {
    if (!this.state.gameState) return;

    for (const [playerId, ws] of this.connections) {
      const playerKey = this.getPlayerKey(playerId);
      if (!playerKey) continue;

      const sanitized = sanitizeForPlayer(this.state.gameState, playerKey);
      const msg: ServerMessage = {
        type: 'GAME_EVENT',
        event: { type: 'STATE_SYNC', state: sanitized },
      };
      this.sendTo(playerId, msg);
    }
  }

  reconnectPlayer(playerId: string, ws: WebSocket): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;
    player.connected = true;
    this.connections.set(playerId, ws);
    this.state.lastActivity = Date.now();

    // Send current state
    if (this.state.gameState) {
      const playerKey = this.getPlayerKey(playerId);
      if (playerKey) {
        const sanitized = sanitizeForPlayer(this.state.gameState, playerKey);
        this.sendTo(playerId, { type: 'GAME_EVENT', event: { type: 'STATE_SYNC', state: sanitized } });
      }
    }

    return true;
  }

  disconnectPlayer(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (player) {
      player.connected = false;
    }
    this.connections.delete(playerId);

    // Notify other player
    const otherPlayerId = this.getOtherPlayerId(playerId);
    if (otherPlayerId) {
      this.sendTo(otherPlayerId, { type: 'PLAYER_DISCONNECTED', playerId });
    }
  }

  sendTo(playerId: string, msg: ServerMessage): void {
    const ws = this.connections.get(playerId);
    if (ws && ws.readyState === 1) { // WebSocket.OPEN = 1
      ws.send(JSON.stringify(msg));
    }
  }

  broadcast(msg: ServerMessage, excludeId?: string): void {
    for (const [playerId, ws] of this.connections) {
      if (playerId === excludeId) continue;
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(msg));
      }
    }
  }

  private getPlayer(playerId: string): RoomPlayer | null {
    if (this.state.player1?.id === playerId) return this.state.player1;
    if (this.state.player2?.id === playerId) return this.state.player2;
    return null;
  }

  getPlayerKey(playerId: string): PlayerKey | null {
    if (this.state.player1?.id === playerId) return 'player1';
    if (this.state.player2?.id === playerId) return 'player2';
    return null;
  }

  private getOtherPlayerId(playerId: string): string | null {
    if (this.state.player1?.id === playerId) return this.state.player2?.id || null;
    if (this.state.player2?.id === playerId) return this.state.player1?.id || null;
    return null;
  }

  isExpired(): boolean {
    return Date.now() - this.state.lastActivity > 30 * 60 * 1000; // 30 min
  }
}
