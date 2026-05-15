"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Deck } from "@/lib/types";
import { DECK_LIMITS } from "@/lib/types";
import { getCardByNumber } from "@/lib/cards";
import {
  getTotalCards,
  getDeckStats,
  saveDeckToStorage,
  loadDecksFromStorage,
  deleteDeckFromStorage,
  exportDeckToText,
  importDeckFromText,
} from "@/lib/deck";

function getInitialDecks(): Deck[] {
  if (typeof window === "undefined") return [];
  return loadDecksFromStorage();
}

export function DeckBuilder() {
  const [decks, setDecks] = useState<Deck[]>(getInitialDecks);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importName, setImportName] = useState("My Deck");
  const [copied, setCopied] = useState(false);

  const activeDeck = useMemo(
    () => decks.find((d) => d.id === activeDeckId) ?? null,
    [decks, activeDeckId]
  );

  const handleImport = useCallback(() => {
    const cards = importDeckFromText(importText);
    if (cards.length === 0) return;

    const deck: Deck = {
      id: crypto.randomUUID(),
      name: importName || "Imported Deck",
      cards,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveDeckToStorage(deck);
    setDecks(loadDecksFromStorage());
    setActiveDeckId(deck.id);
    setShowImport(false);
    setImportText("");
    setImportName("My Deck");
  }, [importText, importName]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteDeckFromStorage(id);
      setDecks(loadDecksFromStorage());
      if (activeDeckId === id) setActiveDeckId(null);
    },
    [activeDeckId]
  );

  const handleExport = useCallback(
    (deck: Deck) => {
      const text = exportDeckToText(deck);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    []
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Deck Manager</h1>
          <p className="text-muted mt-1">
            Import decks from{" "}
            <a
              href="https://exburst.dev/ua/en/deckbuilder"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-light transition-colors underline"
            >
              ExBurst
            </a>
            , view stats, and manage your collection
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white text-sm font-medium transition-colors"
          >
            Import Deck
          </button>
          <a
            href="https://exburst.dev/ua/en/deckbuilder"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg border border-card-border text-muted hover:text-foreground hover:border-accent text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            Build on ExBurst
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>

      {activeDeck ? (
        /* Deck viewer */
        <DeckViewer
          deck={activeDeck}
          onBack={() => setActiveDeckId(null)}
          onExport={() => handleExport(activeDeck)}
          onDelete={() => handleDelete(activeDeck.id)}
          copied={copied}
        />
      ) : (
        /* Deck list */
        <DeckList
          decks={decks}
          onSelect={setActiveDeckId}
          onDelete={handleDelete}
          onImport={() => setShowImport(true)}
        />
      )}

      {/* Import modal */}
      {showImport && (
        <Modal onClose={() => setShowImport(false)} title="Import Deck">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Deck Name</label>
              <input
                type="text"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                className="w-full bg-background border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Decklist</label>
              <p className="text-xs text-muted mb-2">
                Paste your decklist in the format: <code className="text-accent">4x UE04BT/CGH-1-001 Card Name</code>
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"4x UE04BT/CGH-1-001 Kaname Ohgi\n3x UE04BT/CGH-1-003 Kallen Kozuki\n2x UE04BT/CGH-1-005 C.C."}
                className="w-full h-56 bg-background border border-card-border rounded-lg p-3 text-sm text-foreground font-mono resize-none focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImport(false)}
                className="px-4 py-2 text-sm rounded-lg border border-card-border text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-light text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Import
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DeckList({
  decks,
  onSelect,
  onDelete,
  onImport,
}: {
  decks: Deck[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: () => void;
}) {
  if (decks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🃏</div>
        <h2 className="text-xl font-semibold mb-2">No decks yet</h2>
        <p className="text-muted mb-6 max-w-md mx-auto">
          Build your deck on{" "}
          <a
            href="https://exburst.dev/ua/en/deckbuilder"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-accent-light underline"
          >
            ExBurst
          </a>
          , then import it here to view stats and manage your decks.
        </p>
        <button
          onClick={onImport}
          className="px-6 py-3 rounded-lg bg-accent hover:bg-accent-light text-white font-medium transition-colors"
        >
          Import Your First Deck
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck) => {
        const total = getTotalCards(deck.cards);
        const stats = getDeckStats(deck.cards);
        const previewCards = deck.cards.slice(0, 4);

        return (
          <div
            key={deck.id}
            className="bg-card-bg border border-card-border rounded-xl overflow-hidden card-hover cursor-pointer"
            onClick={() => onSelect(deck.id)}
          >
            {/* Card preview strip */}
            <div className="flex h-24 bg-surface">
              {previewCards.map((dc) => {
                const card = getCardByNumber(dc.cardNumber);
                return card?.imageUrl ? (
                  <div key={dc.cardNumber} className="flex-1 relative">
                    <Image
                      src={card.imageUrl}
                      alt={card.name}
                      fill
                      sizes="120px"
                      className="object-cover object-top"
                    />
                  </div>
                ) : null;
              })}
              {previewCards.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-muted text-sm">
                  Empty deck
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{deck.name}</h3>
                  <p className="text-xs text-muted mt-1">
                    {total} / {DECK_LIMITS.MAIN_DECK_SIZE} cards &middot;{" "}
                    {stats.characterCount} characters &middot;{" "}
                    {stats.eventCount + stats.siteCount} events/sites
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(deck.id);
                  }}
                  className="text-muted hover:text-red-400 transition-colors p-1"
                  title="Delete deck"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {/* Color bar */}
              {Object.keys(stats.colorCounts).length > 0 && (
                <div className="flex gap-1 mt-3">
                  {Object.entries(stats.colorCounts).map(([color, count]) => (
                    <div
                      key={color}
                      className={`h-1.5 rounded-full energy-bg-${color.toLowerCase()}`}
                      style={{ flex: count }}
                      title={`${color}: ${count}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeckViewer({
  deck,
  onBack,
  onExport,
  onDelete,
  copied,
}: {
  deck: Deck;
  onBack: () => void;
  onExport: () => void;
  onDelete: () => void;
  copied: boolean;
}) {
  const stats = useMemo(() => getDeckStats(deck.cards), [deck.cards]);
  const [activeTab, setActiveTab] = useState<"cards" | "stats">("cards");

  const characterCards = useMemo(
    () =>
      deck.cards
        .map((dc) => ({ ...dc, card: getCardByNumber(dc.cardNumber) }))
        .filter((dc) => dc.card?.cardType === "Character"),
    [deck.cards]
  );

  const eventSiteCards = useMemo(
    () =>
      deck.cards
        .map((dc) => ({ ...dc, card: getCardByNumber(dc.cardNumber) }))
        .filter((dc) => dc.card?.cardType === "Event" || dc.card?.cardType === "Site"),
    [deck.cards]
  );

  return (
    <div>
      {/* Back / actions bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Decks
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            className="text-xs px-3 py-1.5 rounded-lg border border-card-border text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            {copied ? "Copied!" : "Copy Decklist"}
          </button>
          <a
            href="https://exburst.dev/ua/en/deckbuilder"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg border border-card-border text-muted hover:text-foreground hover:border-accent transition-colors inline-flex items-center gap-1"
          >
            Edit on ExBurst
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button
            onClick={onDelete}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Deck title & info */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{deck.name}</h2>
        <p className="text-sm text-muted mt-1">
          {stats.totalCards} / {DECK_LIMITS.MAIN_DECK_SIZE} cards
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-card-border mb-6">
        <TabButton active={activeTab === "cards"} onClick={() => setActiveTab("cards")}>
          Cards
        </TabButton>
        <TabButton active={activeTab === "stats"} onClick={() => setActiveTab("stats")}>
          Stats
        </TabButton>
      </div>

      {activeTab === "cards" ? (
        <div className="space-y-6">
          {/* Trigger summary */}
          <div className="flex flex-wrap gap-2">
            <TriggerBadge type="COLOR" count={stats.triggerCounts["COLOR"] || 0} max={DECK_LIMITS.MAX_COLOR_TRIGGERS} />
            <TriggerBadge type="FINAL" count={stats.triggerCounts["FINAL"] || 0} max={DECK_LIMITS.MAX_FINAL_TRIGGERS} />
            <TriggerBadge type="SPECIAL" count={stats.triggerCounts["SPECIAL"] || 0} max={DECK_LIMITS.MAX_SPECIAL_TRIGGERS} />
            {Object.entries(stats.triggerCounts)
              .filter(([type]) => !["COLOR", "FINAL", "SPECIAL"].includes(type))
              .map(([type, count]) => (
                <span
                  key={type}
                  className="text-xs px-2 py-1 rounded bg-card-bg border border-card-border text-muted"
                >
                  {type}: {count}
                </span>
              ))}
          </div>

          {/* Characters */}
          {characterCards.length > 0 && (
            <CardSection
              title={`Characters (${stats.characterCount})`}
              cards={characterCards}
            />
          )}

          {/* Events & Sites */}
          {eventSiteCards.length > 0 && (
            <CardSection
              title={`Events & Sites (${stats.eventCount + stats.siteCount})`}
              cards={eventSiteCards}
            />
          )}
        </div>
      ) : (
        <DeckStatsView stats={stats} />
      )}
    </div>
  );
}

function CardSection({
  title,
  cards,
}: {
  title: string;
  cards: { cardNumber: string; count: number; card?: ReturnType<typeof getCardByNumber> }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-accent mb-3 uppercase tracking-wider">
        {title}
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {cards.map((dc) => {
          if (!dc.card) return null;
          return (
            <Link
              key={dc.cardNumber}
              href={`/cards/${encodeURIComponent(dc.cardNumber)}`}
              className="relative group block"
            >
              <div className="relative aspect-[5/7] rounded-lg overflow-hidden border border-card-border bg-card-bg card-hover">
                {dc.card.imageUrl ? (
                  <Image
                    src={dc.card.imageUrl}
                    alt={dc.card.name}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-muted p-1 text-center">
                    {dc.card.name}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-center text-[10px] text-white py-0.5 font-medium">
                  x{dc.count}
                </div>
              </div>
              <p className="text-[10px] text-muted mt-1 truncate" title={dc.card.name}>
                {dc.card.name}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DeckStatsView({ stats }: { stats: ReturnType<typeof getDeckStats> }) {
  const maxCost = Math.max(
    ...Object.values(stats.costDistribution),
    1
  );
  const maxBp = Math.max(
    ...Object.values(stats.bpDistribution),
    1
  );

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Cards" value={stats.totalCards} />
        <StatCard label="Characters" value={stats.characterCount} />
        <StatCard label="Events" value={stats.eventCount} />
        <StatCard label="Sites" value={stats.siteCount} />
      </div>

      {/* Energy Cost Distribution */}
      <div className="bg-card-bg border border-card-border rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-4">Energy Cost Distribution</h4>
        <div className="flex items-end gap-2 h-32">
          {Array.from({ length: 11 }, (_, i) => {
            const count = stats.costDistribution[i] || 0;
            const height = maxCost > 0 ? (count / maxCost) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted">{count || ""}</span>
                <div
                  className="w-full bg-accent/60 rounded-t"
                  style={{ height: `${height}%`, minHeight: count > 0 ? 4 : 0 }}
                />
                <span className="text-[10px] text-muted">{i}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BP Distribution */}
      {Object.keys(stats.bpDistribution).length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-4">
          <h4 className="text-sm font-semibold mb-4">BP Distribution</h4>
          <div className="flex items-end gap-2 h-32">
            {[1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000].map(
              (bp) => {
                const count = stats.bpDistribution[bp] || 0;
                const height = maxBp > 0 ? (count / maxBp) * 100 : 0;
                return (
                  <div key={bp} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted">{count || ""}</span>
                    <div
                      className="w-full bg-accent-light/60 rounded-t"
                      style={{ height: `${height}%`, minHeight: count > 0 ? 4 : 0 }}
                    />
                    <span className="text-[10px] text-muted">{bp / 1000}k</span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* Color breakdown */}
      {Object.keys(stats.colorCounts).length > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-4">
          <h4 className="text-sm font-semibold mb-4">Color Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(stats.colorCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([color, count]) => (
                <div key={color} className="flex items-center gap-3">
                  <span className={`text-sm font-medium w-16 energy-${color.toLowerCase()}`}>
                    {color}
                  </span>
                  <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full energy-bg-${color.toLowerCase()}`}
                      style={{
                        width: `${(count / stats.totalCards) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted w-8 text-right">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Trigger breakdown */}
      {stats.triggerTotal > 0 && (
        <div className="bg-card-bg border border-card-border rounded-xl p-4">
          <h4 className="text-sm font-semibold mb-4">Triggers ({stats.triggerTotal})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.triggerCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div
                  key={type}
                  className="bg-surface rounded-lg p-3 text-center"
                >
                  <div className="text-lg font-bold text-accent">{count}</div>
                  <div className="text-xs text-muted">{type}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-accent">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}

function TriggerBadge({ type, count, max }: { type: string; count: number; max: number }) {
  const isOver = count > max;
  const colorClass = isOver
    ? "border-red-500 text-red-400 bg-red-500/10"
    : "border-card-border text-muted bg-card-bg";

  return (
    <span className={`text-xs px-2 py-1 rounded border font-medium ${colorClass}`}>
      {type}: {count} / {max}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "text-accent border-b-2 border-accent"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-surface border border-card-border rounded-xl p-6 w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
