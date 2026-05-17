'use client';

import { useState, useCallback } from 'react';
import type { SanitizedGameState, PlayerAction, LifeCardState } from '@/lib/game/types';
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

    if (pendingAction?.type === 'BLOCK_DECISION' && isYours) {
      sendAction({ type: 'BLOCK', blockerInstanceId: instanceId });
      return;
    }
    if (pendingAction?.type === 'SNIPE_CHOOSE' && !isYours) {
      sendAction({ type: 'SNIPE_TARGET', targetInstanceId: instanceId });
      return;
    }
    if (pendingAction?.type === 'ACTIVE_TRIGGER_CHOOSE' && isYours) {
      sendAction({ type: 'CHOOSE_ACTIVE_TARGET', cardInstanceId: instanceId });
      return;
    }
    if (phase === 'ATTACK' && isYourTurn && isYours) {
      sendAction({ type: 'DECLARE_ATTACK', attackerInstanceId: instanceId });
      return;
    }
    if (phase === 'MOVEMENT' && isYourTurn && isYours) {
      setSelectedCard((prev) => (prev === instanceId ? null : instanceId));
      return;
    }
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
      {winner && <GameOverlay winner={winner} winReason={winReason} yourKey={yourKey} />}

      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2 animate-fade-in">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">&times;</button>
        </div>
      )}

      <PhaseBar phase={phase} turn={turn} isYourTurn={isYourTurn} activePlayer={activePlayer} yourKey={yourKey} />

      {/* Main board area */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* ═══════ OPPONENT'S FIELD (mirrored: AP bottom, Energy, Front top) ═══════ */}
        <div className="flex flex-row px-2 py-1 gap-1 items-stretch" style={{ flex: '0 0 auto' }}>

          {/* Opponent Life Area (left column) */}
          <LifeColumn
            lifeCards={opponent.lifeCards}
            label="Opp Life"
            flippable={pendingAction?.type === 'CHOOSE_LIFE_TO_FLIP' && pendingAction.damagedPlayer !== yourKey && isWaitingOnYou}
            onFlip={(index) => sendAction({ type: 'FLIP_LIFE_CARD', lifeIndex: index })}
            mirrored
          />

          {/* Opponent center: AP → Energy → Front (reversed for opponent view) */}
          <div className="flex-1 flex flex-col gap-1">
            {/* Opponent AP */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] text-muted w-8 shrink-0">AP</span>
              <div className="flex gap-1">
                {opponent.ap.map((ap, i) => (
                  <div
                    key={i}
                    className={`w-[40px] h-[56px] rounded border-2 text-[9px] flex items-center justify-center font-bold ${
                      ap.active ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400' : 'bg-card-bg border-card-border text-muted rotate-90'
                    }`}
                  >
                    AP
                  </div>
                ))}
              </div>
            </div>

            {/* Opponent Energy Line */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] text-muted w-8 shrink-0">Engy</span>
              <div className="flex gap-1 justify-center flex-wrap">
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

            {/* Opponent Front Line */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] text-muted w-8 shrink-0">Front</span>
              <div className="flex gap-2 justify-center flex-wrap">
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

          {/* Opponent right column: Deck (top) + Sideline (bottom) */}
          <div className="flex flex-col gap-1 w-[72px] items-center">
            <button onClick={() => { setViewingZone('deck'); setViewingPlayer('opponent'); }}
              className="w-[56px] h-[72px] rounded-lg border-2 border-card-border bg-card-bg flex flex-col items-center justify-center text-[9px] text-muted hover:border-accent transition-colors">
              <span className="font-bold">Deck</span>
              <span>{opponent.deckCount}</span>
            </button>
            <span className="text-[9px] text-muted">Hand: {opponent.handCount}</span>
            <button onClick={() => { setViewingZone('sideline'); setViewingPlayer('opponent'); }}
              className="w-[56px] h-[48px] rounded-lg border-2 border-dashed border-card-border bg-card-bg/50 flex flex-col items-center justify-center text-[9px] text-muted hover:border-accent transition-colors">
              <span>Side</span>
              <span>{opponent.sidelineArea.length}</span>
            </button>
            <button onClick={() => { setViewingZone('remove'); setViewingPlayer('opponent'); }}
              className="w-[56px] h-[48px] rounded-lg border-2 border-dashed border-card-border bg-card-bg/50 flex flex-col items-center justify-center text-[9px] text-muted hover:border-accent transition-colors">
              <span>Rmv</span>
              <span>{opponent.removeArea.length}</span>
            </button>
          </div>
        </div>

        {/* ═══════ BATTLE ZONE DIVIDER ═══════ */}
        <div className="border-t border-card-border mx-4 my-1 relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-background px-3 text-xs text-muted">
            &#x2694; Battle Zone &#x2694;
          </div>
        </div>

        {/* ═══════ YOUR FIELD ═══════ */}
        <div className="flex flex-row px-2 py-1 gap-1 items-stretch" style={{ flex: '0 0 auto' }}>

          {/* Your Life Area (left column) */}
          <LifeColumn
            lifeCards={you.lifeCards}
            label="Your Life"
            flippable={false}
            onFlip={() => {}}
          />

          {/* Your center: Front → Energy → AP */}
          <div className="flex-1 flex flex-col gap-1">
            {/* Your Front Line */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] text-muted w-8 shrink-0">Front</span>
              <div className="flex gap-2 justify-center flex-wrap">
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

            {/* Your Energy Line */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] text-muted w-8 shrink-0">Engy</span>
              <div className="flex gap-1 justify-center flex-wrap">
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

            {/* Your AP */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-[10px] text-muted w-8 shrink-0">AP</span>
              <div className="flex gap-1">
                {you.ap.map((ap, i) => (
                  <div
                    key={i}
                    className={`w-[40px] h-[56px] rounded border-2 text-[9px] flex items-center justify-center font-bold ${
                      ap.active ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400' : 'bg-card-bg border-card-border text-muted rotate-90'
                    }`}
                  >
                    AP
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Your right column: Deck (top) + Sideline + Removal */}
          <div className="flex flex-col gap-1 w-[72px] items-center">
            <button onClick={() => { setViewingZone('deck'); setViewingPlayer('you'); }}
              className="w-[56px] h-[72px] rounded-lg border-2 border-card-border bg-card-bg flex flex-col items-center justify-center text-[9px] text-muted hover:border-accent transition-colors">
              <span className="font-bold">Deck</span>
              <span>{you.deckCount}</span>
            </button>
            <button onClick={() => { setViewingZone('sideline'); setViewingPlayer('you'); }}
              className="w-[56px] h-[48px] rounded-lg border-2 border-dashed border-card-border bg-card-bg/50 flex flex-col items-center justify-center text-[9px] text-muted hover:border-accent transition-colors">
              <span>Side</span>
              <span>{you.sidelineArea.length}</span>
            </button>
            <button onClick={() => { setViewingZone('remove'); setViewingPlayer('you'); }}
              className="w-[56px] h-[48px] rounded-lg border-2 border-dashed border-card-border bg-card-bg/50 flex flex-col items-center justify-center text-[9px] text-muted hover:border-accent transition-colors">
              <span>Rmv</span>
              <span>{you.removeArea.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hand & Actions (bottom) */}
      <div className="border-t border-card-border bg-surface">
        <ActionPanel
          gameState={gameState}
          sendAction={sendAction}
          selectedCard={selectedCard}
          selectedHandCards={selectedHandCards}
          onPlayToLine={handlePlayToLine}
          onClearSelection={() => { setSelectedCard(null); setSelectedHandCards([]); }}
        />
        <HandDisplay
          hand={you.hand}
          selectedCard={selectedCard}
          selectedCards={selectedHandCards}
          onCardClick={handleHandCardClick}
          pendingDiscard={pendingAction?.type === 'CHOOSE_DISCARD'}
        />
      </div>

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

/* ── Life Area Column ── */
function LifeColumn({ lifeCards, label, flippable, onFlip, mirrored }: {
  lifeCards: LifeCardState[];
  label: string;
  flippable: boolean;
  onFlip: (index: number) => void;
  mirrored?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-[2px] w-[52px] shrink-0">
      <span className="text-[9px] text-muted font-medium leading-tight">{label}</span>
      {lifeCards.map((lc) => (
        <button
          key={lc.index}
          onClick={() => flippable && onFlip(lc.index)}
          className={`w-[36px] h-[28px] rounded border-2 flex items-center justify-center text-[8px] font-bold transition-all ${
            lc.faceDown === false
              ? 'border-amber-500/60 bg-amber-500/20 text-amber-400'
              : flippable
              ? 'border-red-500 bg-red-500/20 text-red-400 cursor-pointer hover:scale-110 hover:bg-red-500/30 animate-pulse'
              : 'border-card-border bg-card-bg text-muted cursor-default'
          }`}
        >
          {lc.faceDown === false ? (lc.cardNumber ? lc.cardNumber.slice(-3) : '▲') : `${lc.index + 1}`}
        </button>
      ))}
      {lifeCards.length === 0 && <span className="text-[9px] text-red-400">No life!</span>}
    </div>
  );
}

/* ── Empty card slot placeholders ── */
function EmptySlots({ count, size }: { count: number; size: 'sm' | 'md' }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`border border-dashed border-card-border rounded-lg opacity-30 ${
            size === 'sm' ? 'w-14 h-[76px]' : 'w-[72px] h-[100px]'
          }`}
        />
      ))}
    </>
  );
}
