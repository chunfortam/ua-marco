import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCards, getCardByNumber } from "@/lib/cards";

export async function generateStaticParams() {
  const cards = getAllCards();
  return cards.map((card) => ({
    cardNumber: encodeURIComponent(card.cardNumber),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cardNumber: string }>;
}) {
  const { cardNumber } = await params;
  const card = getCardByNumber(decodeURIComponent(cardNumber));
  if (!card) return { title: "Card Not Found" };
  return {
    title: `${card.name} (${card.cardNumber}) | Union Arena Online`,
    description: card.effect || `${card.name} - ${card.cardType} card from Union Arena TCG`,
  };
}

function getColorBgClass(color?: string): string {
  switch (color?.toLowerCase()) {
    case "red": return "bg-red-500/10 border-red-500/30";
    case "blue": return "bg-blue-500/10 border-blue-500/30";
    case "green": return "bg-green-500/10 border-green-500/30";
    case "yellow": return "bg-yellow-500/10 border-yellow-500/30";
    case "purple": return "bg-purple-500/10 border-purple-500/30";
    default: return "bg-card-bg border-card-border";
  }
}

function getRarityLabel(rarity?: string): string {
  switch (rarity) {
    case "C": return "Common";
    case "U": return "Uncommon";
    case "R": return "Rare";
    case "SR": return "Super Rare";
    case "UR": return "Ultra Rare";
    case "SEC": return "Secret Rare";
    default: return rarity || "Unknown";
  }
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ cardNumber: string }>;
}) {
  const { cardNumber } = await params;
  const card = getCardByNumber(decodeURIComponent(cardNumber));

  if (!card) {
    notFound();
  }

  const colorBg = getColorBgClass(card.requiredEnergyColor);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link href="/cards" className="text-muted hover:text-accent-light transition-colors">
          Card Database
        </Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-foreground">{card.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card Image */}
        <div className="flex justify-center">
          <div className="max-w-sm w-full">
            {card.imageUrl ? (
              <img
                src={card.imageUrl}
                alt={`${card.name} - ${card.cardNumber}`}
                className="w-full rounded-xl shadow-2xl"
              />
            ) : (
              <div className="aspect-[63/88] bg-card-bg border border-card-border rounded-xl flex items-center justify-center text-muted">
                No image available
              </div>
            )}
          </div>
        </div>

        {/* Card Details */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold">{card.name}</h1>
              {card.isParallel && (
                <span className="text-xs font-bold px-2 py-1 rounded bg-accent/80 text-white shrink-0">
                  ALT ART
                </span>
              )}
            </div>
            <p className="text-muted mt-1">{card.cardNumber}</p>
            {card.title && (
              <p className="text-sm text-accent-light mt-1">{card.title}</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className={`rounded-xl border p-5 ${colorBg}`}>
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Card Type" value={card.cardType} />
              <DetailField label="Rarity" value={card.rarity ? `${card.rarity} — ${getRarityLabel(card.rarity)}` : undefined} />
              <DetailField label="AP Cost" value={card.apCost?.toString()} />
              <DetailField label="BP" value={card.bp?.toString()} />
              <DetailField label="Required Energy" value={card.requiredEnergy} />
              <DetailField label="Generated Energy" value={card.generatedEnergy} />
              <DetailField label="Affinity" value={card.affinity} />
              <DetailField label="Set" value={card.setName || card.setCode} />
            </div>
          </div>

          {/* Effect */}
          {card.effect && (
            <div className="bg-card-bg border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wider">
                Effect
              </h2>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {card.effect}
              </p>
            </div>
          )}

          {/* Trigger */}
          {card.trigger && (
            <div className="bg-card-bg border border-card-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wider">
                Trigger
              </h2>
              <p className="text-foreground leading-relaxed">{card.trigger}</p>
            </div>
          )}

          {/* Back button */}
          <Link
            href="/cards"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent-light transition-colors"
          >
            &larr; Back to Card Database
          </Link>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value || value === "undefined") return null;
  return (
    <div>
      <dt className="text-xs text-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value}</dd>
    </div>
  );
}
