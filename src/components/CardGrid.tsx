import Link from "next/link";
import type { Card } from "@/lib/types";

function getColorClass(color?: string): string {
  switch (color?.toLowerCase()) {
    case "red":
      return "energy-bg-red";
    case "blue":
      return "energy-bg-blue";
    case "green":
      return "energy-bg-green";
    case "yellow":
      return "energy-bg-yellow";
    case "purple":
      return "energy-bg-purple";
    default:
      return "";
  }
}

function getRarityBadgeColor(rarity?: string): string {
  switch (rarity) {
    case "UR":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "SR":
      return "bg-purple-500/20 text-purple-400 border-purple-500/50";
    case "R":
      return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    case "SEC":
      return "bg-red-500/20 text-red-400 border-red-500/50";
    case "U":
      return "bg-green-500/20 text-green-400 border-green-500/50";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }
}

export default function CardGrid({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">&#128269;</div>
        <h3 className="text-xl font-semibold mb-2">No cards found</h3>
        <p className="text-muted">
          Try adjusting your search or filters to find what you&apos;re looking
          for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <CardItem key={card.cardNumber} card={card} />
      ))}
    </div>
  );
}

function CardItem({ card }: { card: Card }) {
  const colorClass = getColorClass(card.requiredEnergyColor);

  return (
    <Link
      href={`/cards/${encodeURIComponent(card.cardNumber)}`}
      className="group card-hover"
    >
      <div
        className={`bg-card-bg border rounded-xl overflow-hidden ${
          colorClass
            ? `border-l-2 ${colorClass}`
            : "border-card-border"
        }`}
      >
        {/* Card image */}
        <div className="aspect-[63/88] relative bg-surface overflow-hidden">
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-xs">
              No image
            </div>
          )}
          {/* Rarity badge */}
          {card.rarity && (
            <span
              className={`absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded border ${getRarityBadgeColor(card.rarity)}`}
            >
              {card.rarity}
            </span>
          )}
          {/* Parallel indicator */}
          {card.isParallel && (
            <span className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded bg-accent/80 text-white">
              ALT
            </span>
          )}
        </div>
        {/* Card info */}
        <div className="p-2.5">
          <h3 className="text-xs font-semibold truncate group-hover:text-accent-light transition-colors">
            {card.name}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted truncate">
              {card.cardNumber}
            </span>
            {card.bp && (
              <span className="text-[10px] font-mono text-accent-light">
                BP {card.bp}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
