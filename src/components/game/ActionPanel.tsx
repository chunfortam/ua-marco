'use client';

import type { SanitizedGameState, PlayerAction } from '@/lib/game/types';

interface ActionPanelProps {
  gameState: SanitizedGameState;
  sendAction: (action: PlayerAction) => void;
  selectedCard: string | null;
  selectedHandCards: string[];
  onPlayToLine: (line: 'frontLine' | 'energyLine') => void;
  onClearSelection: () => void;
}

export function ActionPanel({
  gameState,
  sendAction,
  selectedCard,
  selectedHandCards,
  onPlayToLine,
  onClearSelection,
}: ActionPanelProps) {
  const { phase, activePlayer, yourKey, pendingAction, you } = gameState;
  const isYourTurn = activePlayer === yourKey;
  const isWaitingOnYou = pendingAction?.player === yourKey;

  // Mulligan phase
  if (phase === 'MULLIGAN' && isWaitingOnYou) {
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-muted">Mulligan your hand?</span>
        <button
          onClick={() => sendAction({ type: 'MULLIGAN', keepHand: true })}
          className="px-4 py-1.5 bg-accent hover:bg-accent-light text-white rounded text-sm font-medium transition-colors"
        >
          Keep Hand
        </button>
        <button
          onClick={() => sendAction({ type: 'MULLIGAN', keepHand: false })}
          className="px-4 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded text-sm font-medium transition-colors"
        >
          Mulligan
        </button>
      </div>
    );
  }

  // Extra draw decision
  if (pendingAction?.type === 'EXTRA_DRAW_DECISION' && isWaitingOnYou) {
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-muted">Draw an extra card? (rests 1 AP)</span>
        <button
          onClick={() => sendAction({ type: 'EXTRA_DRAW' })}
          className="px-4 py-1.5 bg-accent hover:bg-accent-light text-white rounded text-sm font-medium transition-colors"
        >
          Extra Draw
        </button>
        <button
          onClick={() => sendAction({ type: 'SKIP_EXTRA_DRAW' })}
          className="px-4 py-1.5 border border-card-border text-muted hover:text-foreground rounded text-sm font-medium transition-colors"
        >
          Skip
        </button>
      </div>
    );
  }

  // Block decision
  if (pendingAction?.type === 'BLOCK_DECISION' && isWaitingOnYou) {
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-muted">Block the attack? Click a character to block, or:</span>
        <button
          onClick={() => sendAction({ type: 'TAKE_DAMAGE' })}
          className="px-4 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded text-sm font-medium transition-colors"
        >
          Take Damage
        </button>
      </div>
    );
  }

  // Discard selection
  if (pendingAction?.type === 'CHOOSE_DISCARD' && isWaitingOnYou) {
    const needed = pendingAction.count || 0;
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-muted">
          Discard {needed} card{needed !== 1 ? 's' : ''} ({selectedHandCards.length}/{needed} selected)
        </span>
        <button
          onClick={() => sendAction({ type: 'DISCARD', cardInstanceIds: selectedHandCards })}
          disabled={selectedHandCards.length !== needed}
          className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded text-sm font-medium transition-colors"
        >
          Confirm Discard
        </button>
        <button onClick={onClearSelection} className="px-3 py-1.5 text-muted hover:text-foreground text-sm">
          Clear
        </button>
      </div>
    );
  }

  // Special trigger: choose from remove area
  if (pendingAction?.type === 'SPECIAL_TRIGGER_CHOOSE' && isWaitingOnYou) {
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-yellow-400">SPECIAL Trigger: Choose a card from your Remove Area</span>
        <button
          onClick={() => sendAction({ type: 'SKIP_TRIGGER' })}
          className="px-4 py-1.5 border border-card-border text-muted hover:text-foreground rounded text-sm font-medium transition-colors"
        >
          Skip
        </button>
      </div>
    );
  }

  // Color trigger
  if (pendingAction?.type === 'COLOR_TRIGGER_CHOOSE' && isWaitingOnYou) {
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-yellow-400">COLOR Trigger: Choose an eligible character to play from Remove Area</span>
        <button
          onClick={() => sendAction({ type: 'SKIP_TRIGGER' })}
          className="px-4 py-1.5 border border-card-border text-muted hover:text-foreground rounded text-sm font-medium transition-colors"
        >
          Skip
        </button>
      </div>
    );
  }

  // Active trigger
  if (pendingAction?.type === 'ACTIVE_TRIGGER_CHOOSE' && isWaitingOnYou) {
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-yellow-400">ACTIVE Trigger: Choose a resting character to activate</span>
        <button
          onClick={() => sendAction({ type: 'SKIP_TRIGGER' })}
          className="px-4 py-1.5 border border-card-border text-muted hover:text-foreground rounded text-sm font-medium transition-colors"
        >
          Skip
        </button>
      </div>
    );
  }

  // Snipe choose
  if (pendingAction?.type === 'SNIPE_CHOOSE' && isWaitingOnYou) {
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-yellow-400">SNIPE: Choose an opponent&apos;s resting character to retire</span>
      </div>
    );
  }

  // GET trigger resolved
  if (pendingAction?.type === 'GET_TRIGGER_RESOLVED' && isWaitingOnYou) {
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-green-400">GET Trigger resolved! Card added to hand.</span>
        <button
          onClick={() => sendAction({ type: 'END_PHASE' })}
          className="px-4 py-1.5 bg-accent hover:bg-accent-light text-white rounded text-sm font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  // Selected hand card in main phase: play options
  if (phase === 'MAIN' && isYourTurn && selectedCard && you.hand.some((c) => c.instanceId === selectedCard)) {
    return (
      <div className="px-4 py-2 flex items-center justify-center gap-3">
        <span className="text-sm text-muted">Play to:</span>
        <button
          onClick={() => onPlayToLine('frontLine')}
          className="px-4 py-1.5 bg-accent hover:bg-accent-light text-white rounded text-sm font-medium transition-colors"
        >
          Front Line
        </button>
        <button
          onClick={() => onPlayToLine('energyLine')}
          className="px-4 py-1.5 border border-accent text-accent hover:bg-accent hover:text-white rounded text-sm font-medium transition-colors"
        >
          Energy Line
        </button>
        <button onClick={onClearSelection} className="px-3 py-1.5 text-muted hover:text-foreground text-sm">
          Cancel
        </button>
      </div>
    );
  }

  // Default: phase actions
  if (isYourTurn) {
    return (
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {phase === 'MOVEMENT' && 'Click energy line characters to move them, or:'}
            {phase === 'MAIN' && 'Click a card in hand to play it, or:'}
            {phase === 'ATTACK' && 'Click a front line character to attack with it, or:'}
            {phase === 'START' && 'Starting phase...'}
            {phase === 'END' && 'End phase...'}
          </span>
          {(phase === 'MOVEMENT' || phase === 'MAIN' || phase === 'ATTACK') && (
            <button
              onClick={() => sendAction({ type: 'END_PHASE' })}
              className="px-4 py-1.5 border border-card-border text-muted hover:text-foreground hover:border-foreground rounded text-sm font-medium transition-colors"
            >
              End {phase} Phase
            </button>
          )}
        </div>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to concede?')) {
              sendAction({ type: 'CONCEDE' });
            }
          }}
          className="px-2 py-1 text-red-500/40 hover:text-red-400 text-xs transition-colors"
        >
          Concede
        </button>
      </div>
    );
  }

  // Opponent's turn
  return (
    <div className="px-4 py-2 flex items-center justify-center gap-2">
      <div className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" />
      <span className="text-sm text-muted">Opponent&apos;s turn ({phase})</span>
    </div>
  );
}
