'use client';

import { useEffect, useCallback } from 'react';
import { getCardByNumber, getEnglishEquivalent, hasJapaneseText } from '@/lib/cards';

interface CardInspectModalProps {
  cardNumber: string;
  onClose: () => void;
}

function getColorClass(color?: string): string {
  switch (color?.toLowerCase()) {
    case 'red': return 'text-red-400';
    case 'blue': return 'text-blue-400';
    case 'green': return 'text-green-400';
    case 'yellow': return 'text-yellow-400';
    case 'purple': return 'text-purple-400';
    default: return 'text-muted';
  }
}

function getColorBorderClass(color?: string): string {
  switch (color?.toLowerCase()) {
    case 'red': return 'border-red-500/30';
    case 'blue': return 'border-blue-500/30';
    case 'green': return 'border-green-500/30';
    case 'yellow': return 'border-yellow-500/30';
    case 'purple': return 'border-purple-500/30';
    default: return 'border-card-border';
  }
}

export function CardInspectModal({ cardNumber, onClose }: CardInspectModalProps) {
  const cardData = getCardByNumber(cardNumber);
  const enCard = getEnglishEquivalent(cardNumber);

  // Determine display values: prefer EN when available
  const isJP = hasJapaneseText(cardData?.name) || hasJapaneseText(cardData?.effect);
  const displayName = (isJP && enCard?.name) ? enCard.name : cardData?.name;
  const displayEffect = (isJP && enCard?.effect) ? enCard.effect : cardData?.effect;
  const displayTrigger = (isJP && enCard?.trigger) ? enCard.trigger : cardData?.trigger;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!cardData) return null;

  const colorBorder = getColorBorderClass(cardData.requiredEnergyColor);
  const noEnTranslation = isJP && !enCard;

  return (
    <>
      {/* Transparent backdrop — click to close, board still partially visible */}
      <div
        className="fixed inset-0 z-50 bg-black/30"
        onClick={onClose}
      />

      {/* Side panel — slides in from the right */}
      <div
        className="fixed top-0 right-0 z-50 h-full w-80 bg-card-bg border-l border-card-border shadow-2xl overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="sticky top-0 z-10 bg-card-bg/90 backdrop-blur-sm border-b border-card-border px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted font-medium uppercase tracking-wider">Card Details</span>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-lg leading-none p-1"
          >
            &times;
          </button>
        </div>

        <div className="p-3 space-y-3">
          {/* Enlarged card image */}
          <div className="flex justify-center">
            {cardData.imageUrl ? (
              <img
                src={cardData.imageUrl}
                alt={displayName || cardData.cardNumber}
                className="w-full max-w-[240px] rounded-lg shadow-xl"
              />
            ) : (
              <div className="w-full max-w-[240px] aspect-[63/88] bg-surface border border-card-border rounded-lg flex items-center justify-center text-muted">
                No image
              </div>
            )}
          </div>

          {/* Card name */}
          <div>
            <h2 className="text-lg font-bold leading-tight">{displayName}</h2>
            {isJP && enCard && cardData.name !== displayName && (
              <p className="text-xs text-muted mt-0.5">{cardData.name}</p>
            )}
            <p className="text-xs text-muted mt-0.5">{cardData.cardNumber}</p>
            {cardData.title && (
              <p className="text-xs text-accent-light mt-0.5">{cardData.title}</p>
            )}
          </div>

          {/* No translation notice */}
          {noEnTranslation && (
            <div className="text-[10px] text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1">
              English translation not available for this card
            </div>
          )}

          {/* Stats */}
          <div className={`grid grid-cols-2 gap-x-3 gap-y-1 text-sm border rounded-lg p-2.5 ${colorBorder} bg-surface/50`}>
            {cardData.cardType && (
              <StatItem label="Type" value={cardData.cardType} />
            )}
            {cardData.rarity && (
              <StatItem label="Rarity" value={cardData.rarity} />
            )}
            {cardData.apCost !== undefined && (
              <StatItem label="AP Cost" value={String(cardData.apCost)} />
            )}
            {cardData.bp !== undefined && (
              <StatItem label="BP" value={String(cardData.bp)} />
            )}
            {cardData.requiredEnergy && (
              <StatItem
                label="Energy"
                value={cardData.requiredEnergy}
                valueClass={getColorClass(cardData.requiredEnergyColor)}
              />
            )}
            {cardData.generatedEnergy && (
              <StatItem
                label="Gen. Energy"
                value={cardData.generatedEnergy}
                valueClass={getColorClass(cardData.generatedEnergy)}
              />
            )}
            {cardData.affinity && (
              <StatItem label="Affinity" value={cardData.affinity} />
            )}
          </div>

          {/* Effect */}
          {(displayEffect || cardData.effect) && (
            <div className="bg-surface/50 border border-card-border rounded-lg p-2.5">
              <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                Effect
              </h3>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {displayEffect}
              </p>
            </div>
          )}

          {/* Trigger */}
          {(displayTrigger || cardData.trigger) && (
            <div className="bg-surface/50 border border-card-border rounded-lg p-2.5">
              <h3 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">
                Trigger
              </h3>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {displayTrigger}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatItem({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-1">
      <span className="text-muted text-[10px]">{label}</span>
      <span className={`font-medium text-xs text-right ${valueClass || 'text-foreground'}`}>{value}</span>
    </div>
  );
}
