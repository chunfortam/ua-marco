'use client';

import { useState, useCallback } from 'react';
import type { SanitizedGameState, PlayerAction, FieldCard, CardInstance, PendingAction } from '@/lib/game/types';
import { CardSlot } from './CardSlot';
import { HandDisplay } from './HandDisplay';
import { PhaseBar } from './PhaseBar';
import { ActionPanel } from './ActionPanel';
import { GameOverlay } from './GameOverlay';
import { ZoneInfo } from './ZoneInfo';

interface GameBoardProps {
  gameState: SanitizedGameState;
  sendAction: (action: PlayerAction) => void;
  error: string | null;
  clearError: () => void;
}

export function GameBoard({ gameState, sendAction, error, clearError }: GameBoardProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedHandCards, setSelectedHandCards] = useState<string[]>([]);
  const [viewingZone, setViewingZone] = useState<'life' | 'remove' | 'sideline' | 'deck' | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<'you' | 'opponent'>('you');

  const { you, opponent, phase, activePlayer, yourKey, pendingAction, turn, winner, winReason } = gameState;
  const isYourTurn = activePlayer === yourKey;
  const isWaitingOnYou = pendingAction?.player === yourKey;

  const handleFieldCardClick = useCallback((instanceId: string, isYours: boolean) => {
    if (!isYours && !isWaitingOnYou) return;

    // Block selection
    if (pendingAction?.type === 'BLOCK_DECISION' && isYours) {
      sendAction({ type: 'BLOCK', blockerInstanceId: instanceId });
      return;
    }

    // Snipe target selection
    if (pendingAction?.type === 'SNIPE_CHOOSE' && !isYours) {
      sendAction({ type: 'SNIPE_TARGET', targetInstanceId: instanceId });
      return;
    }

    // Active trigger: choose resting character to activate
    if (pendingAction?.type === 'ACTIVE_TRIGGER_CHOOSE' && isYours) {
      sendAction({ type: 'CHOOSE_ACTIVE_TARGET', cardInstanceId: instanceId });
      return;
    }

    // Color trigger: choose eligible character to play from remove area (handled in zone view)

    // Attack declaration
    if (phase === 'ATTACK' && isYourTurn && isYours) {
      sendAction({ type: 'DECLARE_ATTACK', attackerInstanceId: instanceId });
      return;
    }

    // Movement: select card to move to front or step to energy
    if (phase === 'MOVEMENT' && isYourTurn && isYours) {
      setSelectedCard((prev) => (prev === instanceId ? null : instanceId));
      return;
    }

    // Main phase: select for RAID target
    if (phase === 'MAIN' && isYourTurn && isYours && selectedCard) {
      sendAction({ type: 'RAID', cardInstanceId: selectedCard, targetInstanceId: instanceId, moveToFront: false });
      setSelectedCard(null);
      return;
    }

    setSelectedCard((prev) => (prev === instanceId ? null : instanceId));
  }, [isWaitingOnYou, pendingAction, phase, isYourTurn, selectedCard, sendAction]);

  const handleHandCardClick = useCallback((instanceId: string) => {
    if (pendingAction?.type === 'CHOOSE_DISCARD') {
      setSelectedHandCards((prev) => {
        if (prev.includes(instanceId)) return prev.filter((id) => id !== instanceId);
        return [...prev, instanceId];
      });
      return;
    }

    // Main phase: play card
    if (phase === 'MAIN' && isYourTurn) {
      setSelectedCard((prev) => (prev === instanceId ? null : instanceId));
      return;
    }

    setSelectedCard((prev) => (prev === instanceId ? null : instanceId));
  }, [pendingAction, phase, isYourTurn]);

  const handlePlayToLine = useCallback((targetLine: 'frontLine' | 'energyLine') => {
    if (!selectedCard || phase !== 'MAIN') return;
    sendAction({ type: 'PLAY_CARD', cardInstanceId: selectedCard, targetLine });
    setSelectedCard(null);
  }, [selectedCard, phase, sendAction]);

  const handleMoveToFront = useCallback(() => {
    if (!selectedCard || phase !== 'MOVEMENT') return;
    sendAction({ type: 'MOVE_TO_FRONT', instanceIds: [selectedCard] });
    setSelectedCard(null);
  }, [selectedCard, phase, sendAction]);

  const handleStepToEnergy = useCallback(() => {
    if (!selectedCard || phase !== 'MOVEMENT') return;
    sendAction({ type: 'STEP_TO_ENERGY', instanceId: selectedCard });
    setSelectedCard(null);
  }, [selectedCard, phase, sendAction]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background overflow-hidden relative">
      {/* Game Over Overlay */}
      {winner && <GameOverlay winner={winner} winReason={winReason} yourKey={yourKey} />}

      {/* Error Banner */}
      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2 animate-fade-in">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">&times;</button>
        </div>
      )}

      {/* Phase Bar */}
      <PhaseBar
        phase={phase}
        turn={turn}
        isYourTurn={isYourTurn}
        activePlayer={activePlayer}
        yourKey={yourKey}
      />

      {/* Opponent's Field (top half) */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Opponent Info */}
        <div className="px-4 py-1 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted">Opponent</span>
            <div className="flex gap-1">
              {opponent.ap.map((ap, i) => (
                <div
                  key={i}
                  className={`w-5 h-7 rounded text-xs flex items-center justify-center font-bold border ${
                    ap.active ? 'bg-yellow-500/30 border-yellow-500 text-yellow-400' : 'bg-card-bg border-card-border text-muted'
                  }`}
                >
                  AP
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            <button onClick={() => { setViewingZone('life'); setViewingPlayer('opponent'); }} className="hover:text-foreground">
              Life: {opponent.lifeCount}
            </button>
            <button onClick={() => { setViewingZone('deck'); setViewingPlayer('opponent'); }} className="hover:text-foreground">
              Deck: {opponent.deckCount}
            </button>
            <span>Hand: {opponent.handCount}</span>
            <button onClick={() => { setViewingZone('remove'); setViewingPlayer('opponent'); }} className="hover:text-foreground">
              Remove: {opponent.removeArea.length}
            </button>
          </div>
        </div>

        {/* Opponent Energy Line */}
        <div className="px-4 py-1">
          <div className="flex items-center gap-1 min-h-[60px]">
            <span className="text-xs text-muted w-16 shrink-0">Energy</span>
            <div className="flex gap-1 flex-1 justify-center">
              {opponent.energyLine.map((card) => (
                <CardSlot
                  key={card.instanceId}
                  card={card}
                  isYours={false}
                  isSelected={selectedCard === card.instanceId}
                  onClick={() => handleFieldCardClick(card.instanceId, false)}
                  size="sm"
                />
              ))}
              {opponent.energyLine.length === 0 && <EmptySlots count={4} size="sm" />}
            </div>
          </div>
        </div>

        {/* Opponent Front Line */}
        <div className="px-4 py-1">
          <div className="flex items-center gap-1 min-h-[80px]">
            <span className="text-xs text-muted w-16 shrink-0">Front</span>
            <div className="flex gap-2 flex-1 justify-center">
              {opponent.frontLine.map((card) => (
                <CardSlot
                  key={card.instanceId}
                  card={card}
                  isYours={false}
                  isSelected={selectedCard === card.instanceId}
                  onClick={() => handleFieldCardClick(card.instanceId, false)}
                  size="md"
                />
              ))}
              {opponent.frontLine.length === 0 && <EmptySlots count={4} size="md" />}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-card-border mx-4 my-1 relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-3 text-xs text-muted">
            &#x2694; Battle Zone &#x2694;
          </div>
        </div>

        {/* Your Front Line */}
        <div className="px-4 py-1">
          <div className="flex items-center gap-1 min-h-[80px]">
            <span className="text-xs text-muted w-16 shrink-0">Front</span>
            <div className="flex gap-2 flex-1 justify-center">
              {you.frontLine.map((card) => (
                <CardSlot
                  key={card.instanceId}
                  card={card}
                  isYours={true}
                  isSelected={selectedCard === card.instanceId}
                  onClick={() => handleFieldCardClick(card.instanceId, true)}
                  size="md"
                  showActions={phase === 'MOVEMENT' && isYourTurn && selectedCard === card.instanceId}
                  onMoveAction={handleStepToEnergy}
                  moveLabel="Step →"
                />
              ))}
              {you.frontLine.length === 0 && <EmptySlots count={4} size="md" />}
            </div>
          </div>
        </div>

        {/* Your Energy Line */}
        <div className="px-4 py-1">
          <div className="flex items-center gap-1 min-h-[60px]">
            <span className="text-xs text-muted w-16 shrink-0">Energy</span>
            <div className="flex gap-1 flex-1 justify-center">
              {you.energyLine.map((card) => (
                <CardSlot
                  key={card.instanceId}
                  card={card}
                  isYours={true}
                  isSelected={selectedCard === card.instanceId}
                  onClick={() => handleFieldCardClick(card.instanceId, true)}
                  size="sm"
                  showActions={phase === 'MOVEMENT' && isYourTurn && selectedCard === card.instanceId}
                  onMoveAction={handleMoveToFront}
                  moveLabel="↑ Front"
                />
              ))}
              {you.energyLine.length === 0 && <EmptySlots count={4} size="sm" />}
            </div>
          </div>
        </div>

        {/* Your Info */}
        <div className="px-4 py-1 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-accent-light font-medium">You</span>
            <div className="flex gap-1">
              {you.ap.map((ap, i) => (
                <div
                  key={i}
                  className={`w-5 h-7 rounded text-xs flex items-center justify-center font-bold border ${
                    ap.active ? 'bg-yellow-500/30 border-yellow-500 text-yellow-400' : 'bg-card-bg border-card-border text-muted'
                  }`}
                >
                  AP
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            <button onClick={() => { setViewingZone('life'); setViewingPlayer('you'); }} className="hover:text-foreground">
              Life: {you.lifeCount}
            </button>
            <button onClick={() => { setViewingZone('deck'); setViewingPlayer('you'); }} className="hover:text-foreground">
              Deck: {you.deckCount}
            </button>
            <button onClick={() => { setViewingZone('remove'); setViewingPlayer('you'); }} className="hover:text-foreground">
              Remove: {you.removeArea.length}
            </button>
            <button onClick={() => { setViewingZone('sideline'); setViewingPlayer('you'); }} className="hover:text-foreground">
              Sideline: {you.sidelineArea.length}
            </button>
          </div>
        </div>
      </div>

      {/* Hand & Actions (bottom) */}
      <div className="border-t border-card-border bg-surface">
        {/* Action Panel */}
        <ActionPanel
          gameState={gameState}
          sendAction={sendAction}
          selectedCard={selectedCard}
          selectedHandCards={selectedHandCards}
          onPlayToLine={handlePlayToLine}
          onClearSelection={() => { setSelectedCard(null); setSelectedHandCards([]); }}
        />

        {/* Hand */}
        <HandDisplay
          hand={you.hand}
          selectedCard={selectedCard}
          selectedCards={selectedHandCards}
          onCardClick={handleHandCardClick}
          pendingDiscard={pendingAction?.type === 'CHOOSE_DISCARD'}
        />
      </div>

      {/* Zone Viewer Modal */}
      {viewingZone && (
        <ZoneInfo
          zone={viewingZone}
          player={viewingPlayer}
          you={you}
          opponent={opponent}
          onClose={() => setViewingZone(null)}
          onCardSelect={pendingAction?.type === 'SPECIAL_TRIGGER_CHOOSE' ? (id) => {
            sendAction({ type: 'CHOOSE_SPECIAL_TARGET', cardInstanceId: id });
            setViewingZone(null);
          } : undefined}
        />
      )}
    </div>
  );
}

function EmptySlots({ count, size }: { count: number; size: 'sm' | 'md' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`border border-dashed border-card-border rounded-lg opacity-30 ${
            size === 'sm' ? 'w-14 h-12' : 'w-18 h-20'
          }`}
        />
      ))}
    </>
  );
}
