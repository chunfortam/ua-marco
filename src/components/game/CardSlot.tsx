'use client';

import type { FieldCard } from '@/lib/game/types';
import { getCardByNumber } from '@/lib/cards';

interface CardSlotProps {
  card: FieldCard;
  isYours: boolean;
  isSelected: boolean;
  onClick: () => void;
  size: 'sm' | 'md';
  showActions?: boolean;
  onMoveAction?: () => void;
  moveLabel?: string;
}

export function CardSlot({
  card,
  isYours,
  isSelected,
  onClick,
  size,
  showActions,
  onMoveAction,
  moveLabel,
}: CardSlotProps) {
  const cardData = getCardByNumber(card.cardNumber);
  const isResting = !card.active;

  const sizeClasses = size === 'sm'
    ? 'w-14 h-12 text-[9px]'
    : 'w-18 h-20 text-[10px]';

  const borderColor = isSelected
    ? 'border-accent ring-2 ring-accent/50'
    : isResting
    ? 'border-red-500/40'
    : 'border-card-border';

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`${sizeClasses} rounded-lg border-2 ${borderColor} overflow-hidden relative transition-all duration-200 hover:scale-105 ${
          isResting ? 'opacity-70' : ''
        } ${card.isSite ? 'bg-emerald-900/30' : 'bg-card-bg'}`}
        title={cardData?.name || card.cardNumber}
      >
        {cardData?.imageUrl ? (
          <img
            src={cardData.imageUrl}
            alt={cardData.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="truncate px-0.5">{cardData?.name?.slice(0, 6) || card.cardNumber}</span>
          </div>
        )}

        {/* BP indicator */}
        {!card.isSite && size === 'md' && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center leading-tight py-0.5">
            <span className={card.currentBP !== card.baseBP ? 'text-yellow-400' : 'text-white'}>
              {card.currentBP}
            </span>
          </div>
        )}

        {/* Resting indicator */}
        {isResting && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl text-[6px] text-white flex items-center justify-center">
            R
          </div>
        )}

        {/* Site indicator */}
        {card.isSite && (
          <div className="absolute top-0 left-0 w-3 h-3 bg-emerald-500 rounded-br text-[6px] text-white flex items-center justify-center">
            S
          </div>
        )}
      </button>

      {/* Move action button */}
      {showActions && onMoveAction && (
        <button
          onClick={(e) => { e.stopPropagation(); onMoveAction(); }}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-accent text-white text-[9px] rounded whitespace-nowrap z-10 hover:bg-accent-light transition-colors"
        >
          {moveLabel}
        </button>
      )}
    </div>
  );
}
