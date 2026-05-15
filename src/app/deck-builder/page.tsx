import type { Metadata } from "next";
import { DeckBuilder } from "@/components/DeckBuilder";

export const metadata: Metadata = {
  title: "Deck Builder | Union Arena Online",
  description: "Build and edit Union Arena TCG decks. Add cards, validate deck rules, and export your decklist.",
};

export default function DeckBuilderPage() {
  return <DeckBuilder />;
}
