'use client';

import type { CardInstance } from '@/lib/game/types';
import { getCardByNumber } from '@/lib/cards';

interface HandDisplayProps {
  hand: CardInstance[];
  selectedCard: string | null;
  selectedCards: string[];
  onCardClick: (instanceId: string) => void;
  pendingDiscard: boolean;
}

export function HandDisplay({ hand, selectedCard, selectedCards, onCardClick, pendingDiscard }: HandDisplayProps) {
  if (hand.length === 0) {
    return (
      <div className="px-4 py-2 text-center text-muted text-sm">
        No cards in hand
      </div>
    );
  }

  return (
    <div className="px-4 py-2 overflow-x-auto">
      <div className="flex gap-1.5 justify-center min-w-min">
        {hand.map((card) => {
          const cardData = getCardByNumber(card.cardNumber);
          const isSelected = selectedCard === card.instanceId || selectedCards.includes(card.instanceId);
          const isDiscardTarget = pendingDiscard && selectedCards.includes(card.instanceId);

          return (
            <button
              key={card.instanceId}
              onClick={() => onCardClick(card.instanceId)}
              className={`w-16 h-22 rounded-lg border-2 overflow-hidden relative transition-all duration-200 hover:scale-105 hover:-translate-y-1 shrink-0 ${
                isSelected
                  ? isDiscardTarget
                    ? 'border-red-500 ring-2 ring-red-500/50 -translate-y-2'
                    : 'border-accent ring-2 ring-accent/50 -translate-y-2'
                  : 'border-card-border'
              }`}
              title={cardData?.name || card.cardNumber}
            >
              {cardData?.imageUrl ? (
                <img
                  src={cardData.imageUrl}
                  alt={cardData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-card-bg flex flex-col items-center justify-center text-[8px] p-0.5 text-center">
                  <span className="truncate w-full">{cardData?.name || card.cardNumber}</span>
                </div>
              )}

              {/* Type/cost badge */}
              {cardData && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[7px] text-center py-0.5 text-white truncate px-0.5">
                  {cardData.cardType?.charAt(0)} {cardData.bp ? `${cardData.bp}BP` : ''} {cardData.requiredEnergyCount ? `${cardData.requiredEnergyCount}E` : '0E'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
