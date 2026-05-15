import Link from "next/link";
import { getCardStats } from "@/lib/cards";

export default function Home() {
  const stats = getCardStats();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            <span className="text-accent-light">UNION ARENA</span>
            <br />
            <span className="text-foreground">ONLINE</span>
          </h1>
          <p className="text-xl text-muted mb-4 max-w-2xl mx-auto">
            Browse the complete card database, build decks, and play Union Arena
            TCG online — all from your browser.
          </p>
          <p className="text-sm text-muted mb-10 italic">
            &ldquo;The power of the king will isolate you.&rdquo;
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cards"
              className="px-8 py-3 bg-accent hover:bg-accent-light text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Browse Card Database
            </Link>
            <Link
              href="/deck-builder"
              className="px-8 py-3 border border-accent text-accent hover:bg-accent hover:text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Deck Manager
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">
            Card Database
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard label="Total Cards" value={stats.total} />
            <StatCard
              label="Characters"
              value={stats.byType["Character"] || 0}
            />
            <StatCard label="Events" value={stats.byType["Event"] || 0} />
            <StatCard label="Sites" value={stats.byType["Site"] || 0} />
          </div>
        </div>
      </section>

      {/* Titles */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">
            Available Titles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TitleCard
              name="CODE GEASS Lelouch of the Rebellion"
              setCode="UE04BT"
              cardCount={
                Object.values(stats.byType).reduce((a, b) => a + b, 0) || 0
              }
            />
          </div>
          <p className="text-center text-muted mt-8 text-sm">
            More titles coming soon — BLEACH, HUNTER X HUNTER, Jujutsu Kaisen,
            and more!
          </p>
        </div>
      </section>

      {/* What is this */}
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6">What is Union Arena Online?</h2>
          <p className="text-muted leading-relaxed mb-4">
            Union Arena Online is a free, community-driven platform dedicated to
            the Union Arena Trading Card Game by Bandai. Our goal is to provide a
            complete card database, deck builder, and eventually a fully automated
            online play experience — all from your browser.
          </p>
          <p className="text-muted leading-relaxed">
            Whether you&apos;re building your next competitive deck, exploring card
            interactions, or preparing for your local tournament, Union Arena
            Online is here to help you level up your game.
          </p>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-6 text-center">
      <div className="text-3xl font-bold text-accent-light mb-1">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function TitleCard({
  name,
  setCode,
  cardCount,
}: {
  name: string;
  setCode: string;
  cardCount: number;
}) {
  return (
    <Link
      href={`/cards?set=${setCode}`}
      className="bg-card-bg border border-card-border rounded-xl p-6 hover:border-accent transition-colors group card-hover"
    >
      <h3 className="font-bold text-lg group-hover:text-accent-light transition-colors">
        {name}
      </h3>
      <div className="flex items-center gap-4 mt-2 text-sm text-muted">
        <span>{setCode}</span>
        <span>{cardCount} cards</span>
      </div>
    </Link>
  );
}
