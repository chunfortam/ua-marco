'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  ClientMessage,
  ServerMessage,
  SanitizedGameState,
  PlayerAction,
  ConnectionState,
  RoomPhase,
} from './types';

interface GameSocketState {
  connectionState: ConnectionState;
  roomCode: string | null;
  playerId: string | null;
  gameState: SanitizedGameState | null;
  roomPhase: RoomPhase;
  opponentName: string | null;
  opponentReady: boolean;
  error: string | null;
  events: ServerMessage[];
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  setDeck: (deckCards: string[]) => void;
  setReady: () => void;
  sendAction: (action: PlayerAction) => void;
  clearError: () => void;
}

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return `ws://${host}:3001`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

const WS_URL = getWsUrl();
console.log('[GameSocket] WS_URL:', WS_URL);

export const GameSocketContext = createContext<GameSocketState | null>(null);

export function useGameSocket(): GameSocketState {
  const ctx = useContext(GameSocketContext);
  if (!ctx) {
    throw new Error('useGameSocket must be used within a GameSocketProvider');
  }
  return ctx;
}

export function useGameSocketProvider(): GameSocketState {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<SanitizedGameState | null>(null);
  const [roomPhase, setRoomPhase] = useState<RoomPhase>('lobby');
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ServerMessage[]>([]);

  const handleMessage = useCallback((msg: ServerMessage) => {
    setEvents((prev) => [...prev.slice(-99), msg]);

    switch (msg.type) {
      case 'ROOM_CREATED':
        setRoomCode(msg.roomCode || null);
        setPlayerId(msg.playerId || null);
        setRoomPhase('lobby');
        break;

      case 'ROOM_JOINED':
        setRoomCode(msg.roomCode || null);
        setPlayerId(msg.playerId || null);
        setRoomPhase('deck_select');
        break;

      case 'PLAYER_JOINED':
        setOpponentName(msg.playerName || 'Opponent');
        setRoomPhase('deck_select');
        break;

      case 'PLAYER_READY':
        setOpponentReady(true);
        break;

      case 'GAME_EVENT':
        if (msg.event?.type === 'STATE_SYNC' && msg.event.state) {
          setGameState(msg.event.state);
          setRoomPhase('in_game');
          if (msg.event.state.winner) {
            setRoomPhase('finished');
          }
        }
        break;

      case 'ERROR':
        setError(msg.error || 'Unknown error');
        break;

      case 'PLAYER_DISCONNECTED':
        setError('Opponent disconnected');
        break;

      case 'PLAYER_RECONNECTED':
        setError(null);
        break;

      case 'ROOM_CLOSED':
        setRoomPhase('finished');
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[GameSocket] Already connected/connecting, skipping');
      return;
    }

    console.log('[GameSocket] Connecting to', WS_URL);
    setConnectionState('connecting');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[GameSocket] Connected!');
      setConnectionState('connected');
      setError(null);
    };

    ws.onclose = (event) => {
      console.log('[GameSocket] Closed:', event.code, event.reason);
      setConnectionState('disconnected');
      wsRef.current = null;
    };

    ws.onerror = (event) => {
      console.error('[GameSocket] Error:', event);
      setConnectionState('error');
      setError('Connection to game server failed');
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch {
        // ignore invalid messages
      }
    };

    wsRef.current = ws;
  }, [handleMessage]);

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const createRoom = useCallback((playerName: string) => {
    connect();
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        clearInterval(interval);
        send({ type: 'CREATE_ROOM', playerName });
      }
    }, 100);
    setTimeout(() => clearInterval(interval), 5000);
  }, [connect, send]);

  const joinRoom = useCallback((code: string, playerName: string) => {
    connect();
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        clearInterval(interval);
        send({ type: 'JOIN_ROOM', roomCode: code.toUpperCase(), playerName });
      }
    }, 100);
    setTimeout(() => clearInterval(interval), 5000);
  }, [connect, send]);

  const setDeck = useCallback((deckCards: string[]) => {
    send({ type: 'SET_DECK', deckCards });
  }, [send]);

  const setReady = useCallback(() => {
    send({ type: 'READY' });
  }, [send]);

  const sendAction = useCallback((action: PlayerAction) => {
    send({ type: 'ACTION', action });
  }, [send]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    console.log('[GameSocket] Mount effect - calling connect()');
    connect();
    return () => {
      console.log('[GameSocket] Cleanup - closing WebSocket');
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    connectionState,
    roomCode,
    playerId,
    gameState,
    roomPhase,
    opponentName,
    opponentReady,
    error,
    events,
    createRoom,
    joinRoom,
    setDeck,
    setReady,
    sendAction,
    clearError,
  };
}
