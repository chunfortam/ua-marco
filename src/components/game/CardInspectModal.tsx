'use client';

import { useEffect, useCallback } from 'react';
import { getCardByNumber } from '@/lib/cards';

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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!cardData) return null;

  const colorBorder = getColorBorderClass(cardData.requiredEnergyColor);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card-bg border border-card-border rounded-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row gap-4 p-4">
          {/* Enlarged card image */}
          <div className="shrink-0 flex justify-center">
            {cardData.imageUrl ? (
              <img
                src={cardData.imageUrl}
                alt={cardData.name}
                className="w-56 rounded-lg shadow-xl"
              />
            ) : (
              <div className="w-56 aspect-[63/88] bg-surface border border-card-border rounded-lg flex items-center justify-center text-muted">
                No image
              </div>
            )}
          </div>

          {/* English translation / details */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold leading-tight">{cardData.name}</h2>
                <p className="text-xs text-muted mt-0.5">{cardData.cardNumber}</p>
                {cardData.title && (
                  <p className="text-xs text-accent-light mt-0.5">{cardData.title}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-muted hover:text-foreground text-xl leading-none shrink-0 p-1"
              >
                &times;
              </button>
            </div>

            {/* Stats row */}
            <div className={`grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm border rounded-lg p-3 ${colorBorder} bg-surface/50`}>
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
                  label="Required Energy"
                  value={cardData.requiredEnergy}
                  valueClass={getColorClass(cardData.requiredEnergyColor)}
                />
              )}
              {cardData.generatedEnergy && (
                <StatItem
                  label="Generated Energy"
                  value={cardData.generatedEnergy}
                  valueClass={getColorClass(cardData.generatedEnergy)}
                />
              )}
              {cardData.affinity && (
                <StatItem label="Affinity" value={cardData.affinity} />
              )}
              {cardData.setName && (
                <StatItem label="Set" value={cardData.setName} />
              )}
            </div>

            {/* Effect */}
            {cardData.effect && (
              <div className="bg-surface/50 border border-card-border rounded-lg p-3">
                <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Effect
                </h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {cardData.effect}
                </p>
              </div>
            )}

            {/* Trigger */}
            {cardData.trigger && (
              <div className="bg-surface/50 border border-card-border rounded-lg p-3">
                <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Trigger
                </h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {cardData.trigger}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-muted text-xs">{label}</span>
      <span className={`font-medium text-xs ${valueClass || 'text-foreground'}`}>{value}</span>
    </div>
  );
}
