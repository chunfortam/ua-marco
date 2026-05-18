"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CARD_TYPES, COLORS, RARITIES, SORT_OPTIONS } from "@/lib/types";

export default function CardFilters({ sets }: { sets: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("q") || "";
  const currentType = searchParams.get("type") || "all";
  const currentColor = searchParams.get("color") || "all";
  const currentRarity = searchParams.get("rarity") || "all";
  const currentSet = searchParams.get("set") || "all";
  const currentSort = searchParams.get("sort") || "number-asc";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all" && value !== "") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/cards?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearAll = useCallback(() => {
    router.push("/cards");
  }, [router]);

  const hasFilters =
    currentSearch ||
    currentType !== "all" ||
    currentColor !== "all" ||
    currentRarity !== "all" ||
    currentSet !== "all";

  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-4 sm:p-6 space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search cards by name, number, effect, or affinity..."
          defaultValue={currentSearch}
          onChange={(e) => {
            const timeout = setTimeout(() => {
              updateParams("q", e.target.value);
            }, 300);
            return () => clearTimeout(timeout);
          }}
          className="w-full bg-surface border border-card-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <FilterSelect
          label="Card Type"
          value={currentType}
          onChange={(v) => updateParams("type", v)}
          options={[
            { value: "all", label: "All Types" },
            ...CARD_TYPES.map((t) => ({ value: t, label: t })),
          ]}
        />
        <FilterSelect
          label="Color"
          value={currentColor}
          onChange={(v) => updateParams("color", v)}
          options={[
            { value: "all", label: "All Colors" },
            ...COLORS.map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          label="Rarity"
          value={currentRarity}
          onChange={(v) => updateParams("rarity", v)}
          options={[
            { value: "all", label: "All Rarities" },
            ...RARITIES.map((r) => ({ value: r, label: r })),
          ]}
        />
        <FilterSelect
          label="Set"
          value={currentSet}
          onChange={(v) => updateParams("set", v)}
          options={[
            { value: "all", label: "All Sets" },
            ...sets.map((s) => ({ value: s, label: s })),
          ]}
        />
        <FilterSelect
          label="Sort By"
          value={currentSort}
          onChange={(v) => updateParams("sort", v)}
          options={SORT_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-accent hover:text-accent-light transition-colors self-end pb-2"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
