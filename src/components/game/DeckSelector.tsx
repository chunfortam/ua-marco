'use client';

import { useState, useEffect } from 'react';
import type { Deck } from '@/lib/types';
import { loadDecksFromStorage, importDeckFromText } from '@/lib/deck';

const SAMPLE_DECKS: { name: string; description: string; cards: string[] }[] = [
  {
    name: 'Suzaku Aggro (Purple)',
    description: 'Fast purple deck focused on Suzaku Kururugi and Lancelot mechs. 50 cards.',
    cards: [
      // 4x CGH-1-034 Suzaku Kururugi
      ...Array(4).fill('UE04BT/CGH-1-034'),
      // 4x CGH-1-035 Suzaku Kururugi
      ...Array(4).fill('UE04BT/CGH-1-035'),
      // 4x CGH-1-036 Suzaku Kururugi
      ...Array(4).fill('UE04BT/CGH-1-036'),
      // 4x CGH-1-038 Cornelia li Britannia
      ...Array(4).fill('UE04BT/CGH-1-038'),
      // 4x CGH-1-042 Cécile Croomy
      ...Array(4).fill('UE04BT/CGH-1-042'),
      // 2x CGH-1-048 Lloyd Asplund
      ...Array(2).fill('UE04BT/CGH-1-048'),
      // 4x CGH-1-055 Gloucester (Cornelia Fighter)
      ...Array(4).fill('UE04BT/CGH-1-055'),
      // 4x CGH-1-059 Lancelot
      ...Array(4).fill('UE04BT/CGH-1-059'),
      // 4x CGH-1-060 Lancelot Air Cavalry
      ...Array(4).fill('UE04BT/CGH-1-060'),
      // 4x CGH-2-052 Nunnally vi Britannia
      ...Array(4).fill('UEX03BT/CGH-2-052'),
      // 4x CGH-2-053 Anya Alstreim
      ...Array(4).fill('UEX03BT/CGH-2-053'),
      // 4x CGH-1-062 Live!
      ...Array(4).fill('UE04BT/CGH-1-062'),
      // 4x CGH-1-063 V.A.R.I.S.
      ...Array(4).fill('UE04BT/CGH-1-063'),
    ],
  },
];

interface DeckSelectorProps {
  onDeckSelect: (deckCards: string[]) => void;
}

export function DeckSelector({ onDeckSelect }: DeckSelectorProps) {
  const [savedDecks, setSavedDecks] = useState<Deck[]>([]);
  const [importText, setImportText] = useState('');
  const [tab, setTab] = useState<'sample' | 'saved' | 'import'>('sample');

  useEffect(() => {
    setSavedDecks(loadDecksFromStorage());
  }, []);

  const handleSavedDeck = (deck: Deck) => {
    const cards: string[] = [];
    for (const dc of deck.cards) {
      for (let i = 0; i < dc.count; i++) {
        cards.push(dc.cardNumber);
      }
    }
    onDeckSelect(cards);
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const deckCards = importDeckFromText(importText);
    if (deckCards.length === 0) return;
    const cards: string[] = [];
    for (const dc of deckCards) {
      for (let i = 0; i < dc.count; i++) {
        cards.push(dc.cardNumber);
      }
    }
    onDeckSelect(cards);
  };

  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <div className="flex border-b border-card-border">
        <button
          onClick={() => setTab('sample')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            tab === 'sample' ? 'bg-accent/20 text-accent-light border-b-2 border-accent' : 'text-muted hover:text-foreground'
          }`}
        >
          Sample Decks
        </button>
        <button
          onClick={() => setTab('saved')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            tab === 'saved' ? 'bg-accent/20 text-accent-light border-b-2 border-accent' : 'text-muted hover:text-foreground'
          }`}
        >
          Saved ({savedDecks.length})
        </button>
        <button
          onClick={() => setTab('import')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            tab === 'import' ? 'bg-accent/20 text-accent-light border-b-2 border-accent' : 'text-muted hover:text-foreground'
          }`}
        >
          Import
        </button>
      </div>

      <div className="p-6">
        {tab === 'sample' && (
          <div className="space-y-3">
            {SAMPLE_DECKS.map((deck, i) => (
              <button
                key={i}
                onClick={() => onDeckSelect(deck.cards)}
                className="w-full text-left p-4 bg-surface border border-card-border rounded-lg hover:border-accent transition-colors group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium group-hover:text-accent-light transition-colors">{deck.name}</p>
                    <p className="text-sm text-muted">{deck.description}</p>
                  </div>
                  <span className="text-accent text-sm">Select &rarr;</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'saved' && (
          <div>
            {savedDecks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted mb-2">No saved decks</p>
                <p className="text-sm text-muted">
                  Go to the <a href="/deck-builder" className="text-accent hover:text-accent-light">Deck Manager</a> to import a deck first, or use the Import tab.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedDecks.map((deck) => {
                  const totalCards = deck.cards.reduce((sum, dc) => sum + dc.count, 0);
                  return (
                    <button
                      key={deck.id}
                      onClick={() => handleSavedDeck(deck)}
                      className="w-full text-left p-4 bg-surface border border-card-border rounded-lg hover:border-accent transition-colors group"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium group-hover:text-accent-light transition-colors">{deck.name}</p>
                          <p className="text-sm text-muted">{totalCards} cards</p>
                        </div>
                        <span className="text-accent text-sm">Select &rarr;</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'import' && (
          <div>
            <p className="text-sm text-muted mb-3">Paste your decklist (ExBurst or text format):</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`4x UE04BT-001 Lelouch Lamperouge\n4x UE04BT-002 Suzaku Kururugi\n...`}
              className="w-full h-48 px-4 py-3 bg-background border border-card-border rounded-lg text-foreground placeholder:text-muted text-sm font-mono focus:outline-none focus:border-accent resize-none"
            />
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="mt-3 w-full px-4 py-3 bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Use This Deck
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
