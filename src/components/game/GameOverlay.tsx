'use client';

import type { PlayerKey } from '@/lib/game/types';
import Link from 'next/link';

interface GameOverlayProps {
  winner: PlayerKey;
  winReason: string | null;
  yourKey: PlayerKey;
}

export function GameOverlay({ winner, winReason, yourKey }: GameOverlayProps) {
  const youWon = winner === yourKey;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in">
      <div className="text-center">
        <div className={`text-6xl font-bold mb-4 ${youWon ? 'text-accent-light' : 'text-red-400'}`}>
          {youWon ? 'VICTORY' : 'DEFEAT'}
        </div>
        {winReason && (
          <p className="text-muted text-lg mb-8">{winReason}</p>
        )}
        <div className="flex gap-4 justify-center">
          <Link
            href="/vs"
            className="px-6 py-3 bg-accent hover:bg-accent-light text-white rounded-lg font-semibold transition-colors"
          >
            Play Again
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-card-border text-muted hover:text-foreground rounded-lg font-semibold transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
