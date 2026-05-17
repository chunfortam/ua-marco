import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Union Arena Online",
  description:
    "A free online platform for the Union Arena Trading Card Game. Browse cards, build decks, and play online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-card-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
                UA
              </div>
              <span className="text-lg font-bold tracking-tight group-hover:text-accent-light transition-colors">
                UNION ARENA ONLINE
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/cards"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Card Database
              </Link>
              <Link
                href="/deck-builder"
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Deck Manager
              </Link>
              <Link
                href="/vs"
                className="text-sm px-4 py-2 rounded-lg bg-accent hover:bg-accent-light text-white transition-colors"
              >
                VS Mode
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-card-border bg-surface py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-muted">
                <span className="font-semibold text-foreground">
                  Union Arena Online
                </span>{" "}
                &mdash; A fan-made platform for the Union Arena TCG
              </div>
              <div className="text-xs text-muted flex items-center gap-3">
                <span>
                  All card images and Union Arena trademarks are property of
                  BANDAI. This is a non-official fan project.
                </span>
                <span className="text-muted/50">v0.9.1</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
