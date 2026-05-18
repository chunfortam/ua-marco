import { Suspense } from "react";
import { filterCards, getUniqueSets } from "@/lib/cards";
import CardGrid from "@/components/CardGrid";
import CardFilters from "@/components/CardFilters";

export const metadata = {
  title: "Card Database | Union Arena Online",
  description:
    "Browse and search the complete Union Arena TCG card database. Filter by type, color, rarity, and more.",
};

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const cardType = typeof params.type === "string" ? params.type : "all";
  const color = typeof params.color === "string" ? params.color : "all";
  const rarity = typeof params.rarity === "string" ? params.rarity : "all";
  const set = typeof params.set === "string" ? params.set : "all";
  const sortBy = typeof params.sort === "string" ? params.sort : "number-asc";

  const cards = filterCards({ search, cardType, color, rarity, set, sortBy });
  const sets = getUniqueSets();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Card Database</h1>
        <p className="text-muted text-sm">
          {cards.length} cards found
        </p>
      </div>

      <Suspense fallback={<div className="text-muted">Loading filters...</div>}>
        <CardFilters sets={sets} />
      </Suspense>

      <div className="mt-6">
        <CardGrid cards={cards} />
      </div>
    </div>
  );
}
