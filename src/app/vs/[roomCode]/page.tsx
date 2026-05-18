'use client';

import { use, useEffect, useState } from 'react';
import { useGameSocket } from '@/lib/game/useGameSocket';
import { DeckSelector } from '@/components/game/DeckSelector';
import { GameBoard } from '@/components/game/GameBoard';
import Link from 'next/link';

export default function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode: routeCode } = use(params);
  const socket = useGameSocket();
  const [deckSet, setDeckSet] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // If we navigated directly to this URL (no active connection), try to join
  useEffect(() => {
    if (socket.connectionState === 'disconnected' && !socket.roomCode) {
      const name = localStorage.getItem('ua-player-name') || 'Player';
      socket.joinRoom(routeCode, name);
    }
  }, [routeCode, socket.connectionState, socket.roomCode, socket.joinRoom]);

  const handleDeckSelect = (deckCards: string[]) => {
    socket.setDeck(deckCards);
    setDeckSet(true);
  };

  const handleReady = () => {
    socket.setReady();
    setIsReady(true);
  };

  // Show error state
  if (socket.error && socket.roomPhase === 'lobby') {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{socket.error}</p>
          <Link href="/vs" className="text-accent hover:text-accent-light transition-colors">
            &larr; Back to Lobby
          </Link>
        </div>
      </div>
    );
  }

  // Deck selection phase
  if (socket.roomPhase === 'deck_select' || (socket.roomPhase === 'lobby' && socket.roomCode && !socket.gameState)) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Room: <span className="text-accent-light font-mono">{routeCode}</span></h1>
              <p className="text-sm text-muted">
                {socket.opponentName ? `Opponent: ${socket.opponentName}` : 'Waiting for opponent...'}
              </p>
            </div>
            <div className="text-right text-sm text-muted">
              {socket.opponentReady && <span className="text-green-400">Opponent ready</span>}
            </div>
          </div>

          {socket.error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {socket.error}
            </div>
          )}

          {!deckSet ? (
            <DeckSelector onDeckSelect={handleDeckSelect} />
          ) : !isReady ? (
            <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
              <p className="text-foreground mb-4">Deck loaded! Ready to play?</p>
              <button
                onClick={handleReady}
                className="px-8 py-3 bg-accent hover:bg-accent-light text-white rounded-lg font-semibold text-lg transition-colors"
              >
                Ready
              </button>
            </div>
          ) : (
            <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
              <div className="flex items-center justify-center gap-2 text-muted">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Ready! Waiting for opponent...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Game in progress
  if (socket.gameState && (socket.roomPhase === 'in_game' || socket.roomPhase === 'finished')) {
    return (
      <GameBoard
        gameState={socket.gameState}
        sendAction={socket.sendAction}
        error={socket.error}
        clearError={socket.clearError}
      />
    );
  }

  // Connecting / loading
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-muted mb-4">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <span>Connecting...</span>
        </div>
        <Link href="/vs" className="text-sm text-muted hover:text-foreground transition-colors">
          &larr; Back to Lobby
        </Link>
      </div>
    </div>
  );
}
