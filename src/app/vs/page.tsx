'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameSocket } from '@/lib/game/useGameSocket';
import Link from 'next/link';

export default function VSLobbyPage() {
  const router = useRouter();
  const { connectionState, roomCode, roomPhase, opponentName, error, createRoom, joinRoom, clearError } = useGameSocket();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreate = () => {
    if (!playerName.trim()) return;
    localStorage.setItem('ua-player-name', playerName.trim());
    createRoom(playerName.trim());
    setMode('create');
  };

  const handleJoin = () => {
    if (!playerName.trim() || !joinCode.trim()) return;
    localStorage.setItem('ua-player-name', playerName.trim());
    joinRoom(joinCode.trim(), playerName.trim());
    setMode('join');
  };

  // Navigate to room when we get a room code and transition to deck_select or in_game
  useEffect(() => {
    if (roomCode && (roomPhase === 'deck_select' || roomPhase === 'in_game')) {
      router.push(`/vs/${roomCode}`);
    }
  }, [roomCode, roomPhase, router]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-accent-light">VS</span> MODE
          </h1>
          <p className="text-muted">Real-time 1v1 Union Arena TCG</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-300 ml-2">&times;</button>
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
                maxLength={20}
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={!playerName.trim()}
              className="w-full px-6 py-4 bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Create Room
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-card-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-4 text-muted">or</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Room Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent uppercase tracking-widest text-center text-xl"
                maxLength={6}
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={!playerName.trim() || !joinCode.trim()}
              className="w-full px-6 py-4 border border-accent text-accent hover:bg-accent hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === 'create' && roomCode && !opponentName && (
          <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted mb-4">Share this code with your opponent:</p>
            <div className="text-5xl font-mono font-bold tracking-[0.3em] text-accent-light mb-6">
              {roomCode}
            </div>
            <div className="flex items-center justify-center gap-2 text-muted">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm">Waiting for opponent...</span>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(roomCode); }}
              className="mt-4 px-4 py-2 text-sm border border-card-border rounded-lg hover:border-accent transition-colors text-muted hover:text-foreground"
            >
              Copy Code
            </button>
          </div>
        )}

        {mode === 'create' && !roomCode && connectionState === 'connecting' && (
          <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-muted">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm">Connecting to server...</span>
            </div>
          </div>
        )}

        {mode === 'join' && connectionState === 'connecting' && (
          <div className="bg-card-bg border border-card-border rounded-xl p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-muted">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm">Joining room...</span>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
