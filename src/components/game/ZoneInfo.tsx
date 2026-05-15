'use client';

import type { CardInstance, SanitizedPlayerState } from '@/lib/game/types';
import { getCardByNumber } from '@/lib/cards';

interface ZoneInfoProps {
  zone: 'life' | 'remove' | 'sideline' | 'deck';
  player: 'you' | 'opponent';
  you: SanitizedPlayerState;
  opponent: SanitizedPlayerState;
  onClose: () => void;
  onCardSelect?: (instanceId: string) => void;
}

export function ZoneInfo({ zone, player, you, opponent, onClose, onCardSelect }: ZoneInfoProps) {
  const p = player === 'you' ? you : opponent;

  let title = '';
  let cards: CardInstance[] = [];
  let countOnly = false;

  switch (zone) {
    case 'life':
      title = `${player === 'you' ? 'Your' : "Opponent's"} Life Area`;
      cards = [];
      countOnly = true;
      break;
    case 'remove':
      title = `${player === 'you' ? 'Your' : "Opponent's"} Remove Area`;
      cards = p.removeArea;
      break;
    case 'sideline':
      title = `${player === 'you' ? 'Your' : "Opponent's"} Sideline Area`;
      cards = p.sidelineArea;
      break;
    case 'deck':
      title = `${player === 'you' ? 'Your' : "Opponent's"} Deck`;
      countOnly = true;
      break;
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-card-bg border border-card-border rounded-xl p-6 max-w-lg w-full mx-4 max-h-[60vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl">&times;</button>
        </div>

        {countOnly ? (
          <div className="text-center py-8">
            <div className="text-4xl font-bold text-accent-light">
              {zone === 'life' ? p.lifeCount : p.deckCount}
            </div>
            <p className="text-muted mt-2">
              {zone === 'life' ? 'cards remaining in Life Area' : 'cards remaining in Deck'}
            </p>
          </div>
        ) : cards.length === 0 ? (
          <p className="text-muted text-center py-8">No cards in this zone</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {cards.map((card) => {
              const cardData = getCardByNumber(card.cardNumber);
              return (
                <button
                  key={card.instanceId}
                  onClick={() => onCardSelect?.(card.instanceId)}
                  disabled={!onCardSelect}
                  className={`rounded-lg border overflow-hidden transition-all ${
                    onCardSelect
                      ? 'border-card-border hover:border-accent cursor-pointer hover:scale-105'
                      : 'border-card-border cursor-default'
                  }`}
                >
                  {cardData?.imageUrl ? (
                    <img src={cardData.imageUrl} alt={cardData.name} className="w-full aspect-[3/4] object-cover" />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-surface flex items-center justify-center text-[9px] text-muted p-1 text-center">
                      {cardData?.name || card.cardNumber}
                    </div>
                  )}
                  <div className="text-[8px] text-muted text-center py-0.5 truncate px-1">
                    {cardData?.name || card.cardNumber}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
