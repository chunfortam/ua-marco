import { WebSocketServer, WebSocket } from 'ws';
import { RoomManager } from './rooms/RoomManager.js';
import { loadCardData } from './engine/utils.js';
import type { ClientMessage, ServerMessage, PlayerAction } from './engine/types.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load card data
const cardsPath = resolve(__dirname, '../../src/data/cards.json');
const cardsJson = JSON.parse(readFileSync(cardsPath, 'utf-8'));
loadCardData(cardsJson);
console.log(`Loaded ${cardsJson.length} cards`);

const PORT = parseInt(process.env.PORT || '3001', 10);
const wss = new WebSocketServer({ port: PORT });
const roomManager = new RoomManager();

// Map WebSocket → playerId
const wsToPlayer = new Map<WebSocket, { playerId: string; roomCode: string }>();

console.log(`Game server running on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  ws.on('message', (data: Buffer) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());
      handleMessage(ws, playerId, msg);
    } catch (err) {
      sendError(ws, 'Invalid message format');
    }
  });

  ws.on('close', () => {
    const info = wsToPlayer.get(ws);
    if (info) {
      const room = roomManager.getRoom(info.roomCode);
      if (room) {
        room.disconnectPlayer(info.playerId);
      }
      wsToPlayer.delete(ws);
    }
  });

  ws.on('error', () => {
    ws.close();
  });
});

function handleMessage(ws: WebSocket, playerId: string, msg: ClientMessage): void {
  switch (msg.type) {
    case 'CREATE_ROOM': {
      const room = roomManager.createRoom();
      const playerKey = room.addPlayer(playerId, msg.playerName || 'Player 1', ws);
      if (!playerKey) {
        sendError(ws, 'Failed to create room');
        return;
      }
      wsToPlayer.set(ws, { playerId, roomCode: room.state.code });
      const response: ServerMessage = {
        type: 'ROOM_CREATED',
        roomCode: room.state.code,
        playerId,
      };
      ws.send(JSON.stringify(response));
      console.log(`Room ${room.state.code} created by ${playerId}`);
      break;
    }

    case 'JOIN_ROOM': {
      if (!msg.roomCode) {
        sendError(ws, 'Room code required');
        return;
      }
      const room = roomManager.getRoom(msg.roomCode);
      if (!room) {
        sendError(ws, 'Room not found');
        return;
      }

      // Check if this is a reconnection
      const existingInfo = wsToPlayer.get(ws);
      if (existingInfo) {
        const reconnected = room.reconnectPlayer(existingInfo.playerId, ws);
        if (reconnected) {
          room.broadcast({ type: 'PLAYER_RECONNECTED', playerId: existingInfo.playerId }, existingInfo.playerId);
          return;
        }
      }

      if (room.isFull) {
        sendError(ws, 'Room is full');
        return;
      }

      const playerKey = room.addPlayer(playerId, msg.playerName || 'Player 2', ws);
      if (!playerKey) {
        sendError(ws, 'Failed to join room');
        return;
      }
      wsToPlayer.set(ws, { playerId, roomCode: room.state.code });

      // Notify joiner
      const joinResponse: ServerMessage = {
        type: 'ROOM_JOINED',
        roomCode: room.state.code,
        playerId,
      };
      ws.send(JSON.stringify(joinResponse));

      // Notify creator
      room.broadcast({
        type: 'PLAYER_JOINED',
        playerId,
        playerName: msg.playerName || 'Player 2',
      }, playerId);

      console.log(`Player ${playerId} joined room ${room.state.code}`);
      break;
    }

    case 'SET_DECK': {
      const info = wsToPlayer.get(ws);
      if (!info) {
        sendError(ws, 'Not in a room');
        return;
      }
      const room = roomManager.getRoom(info.roomCode);
      if (!room) {
        sendError(ws, 'Room not found');
        return;
      }
      if (!msg.deckCards || msg.deckCards.length === 0) {
        sendError(ws, 'Deck cards required');
        return;
      }
      room.setDeck(info.playerId, msg.deckCards);
      console.log(`Player ${info.playerId} set deck (${msg.deckCards.length} cards)`);
      break;
    }

    case 'READY': {
      const info = wsToPlayer.get(ws);
      if (!info) {
        sendError(ws, 'Not in a room');
        return;
      }
      const room = roomManager.getRoom(info.roomCode);
      if (!room) {
        sendError(ws, 'Room not found');
        return;
      }
      const success = room.setReady(info.playerId);
      if (!success) {
        sendError(ws, 'Cannot ready (deck not set?)');
        return;
      }

      // Notify other player
      room.broadcast({ type: 'PLAYER_READY', playerId: info.playerId }, info.playerId);

      // If game started, state is already sent by Room.startGame()
      if (room.state.status === 'IN_GAME') {
        console.log(`Game started in room ${room.state.code}`);
      }
      break;
    }

    case 'ACTION': {
      const info = wsToPlayer.get(ws);
      if (!info) {
        sendError(ws, 'Not in a room');
        return;
      }
      const room = roomManager.getRoom(info.roomCode);
      if (!room) {
        sendError(ws, 'Room not found');
        return;
      }
      if (!msg.action) {
        sendError(ws, 'Action required');
        return;
      }
      const result = room.handleAction(info.playerId, msg.action);
      if ('error' in result) {
        sendError(ws, result.error);
      }
      break;
    }

    default:
      sendError(ws, `Unknown message type: ${msg.type}`);
  }
}

function sendError(ws: WebSocket, message: string): void {
  const msg: ServerMessage = { type: 'ERROR', error: message };
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  roomManager.destroy();
  wss.close();
  process.exit(0);
});
