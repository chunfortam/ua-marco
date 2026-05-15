'use client';

import type { Phase, PlayerKey } from '@/lib/game/types';

const PHASES: Phase[] = ['START', 'MOVEMENT', 'MAIN', 'ATTACK', 'END'];

interface PhaseBarProps {
  phase: Phase;
  turn: number;
  isYourTurn: boolean;
  activePlayer: PlayerKey;
  yourKey: PlayerKey;
}

export function PhaseBar({ phase, turn, isYourTurn, activePlayer, yourKey }: PhaseBarProps) {
  return (
    <div className="bg-surface border-b border-card-border px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">Turn {turn}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
          isYourTurn ? 'bg-accent/20 text-accent-light' : 'bg-card-bg text-muted'
        }`}>
          {isYourTurn ? 'Your Turn' : "Opponent's Turn"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {PHASES.map((p) => {
          const isCurrent = p === phase;
          const isPast = PHASES.indexOf(p) < PHASES.indexOf(phase);

          return (
            <div
              key={p}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-300 ${
                isCurrent
                  ? 'bg-accent text-white scale-110'
                  : isPast
                  ? 'bg-card-bg text-muted'
                  : 'bg-transparent text-muted/50'
              }`}
            >
              {p}
            </div>
          );
        })}
      </div>

      {phase === 'MULLIGAN' && (
        <span className="text-xs text-yellow-400 font-medium">MULLIGAN</span>
      )}
      {phase === 'SETUP' && (
        <span className="text-xs text-muted">Setting up...</span>
      )}
    </div>
  );
}
