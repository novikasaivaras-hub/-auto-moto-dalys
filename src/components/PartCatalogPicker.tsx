
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CatalogPart = {
  id: string;
  name: string;
  category: string;
};

type PartAlias = {
  part_id: string;
  alias: string;
};

type PartCatalogPickerProps = {
  value: string;
  selectedId: string | null;
  category: string;
  onChange: (name: string, id: string | null) => void;
};

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("lt-LT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function PartCatalogPicker({
  value,
  selectedId,
  category,
  onChange,
}: PartCatalogPickerProps) {
  const [parts, setParts] = useState<CatalogPart[]>([]);
  const [aliases, setAliases] = useState<PartAlias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setLoading(true);
      setError("");

      const [partsResult, aliasesResult] = await Promise.all([
        supabase
          .from("part_catalog")
          .select("id, name, category")
          .order("name"),
        supabase
          .from("part_aliases")
          .select("part_id, alias"),
      ]);

      if (!active) return;

      if (partsResult.error || aliasesResult.error) {
        setError(
          partsResult.error?.message ||
            aliasesResult.error?.message ||
            "Nepavyko įkelti detalių katalogo."
        );
      } else {
        setParts(partsResult.data ?? []);
        setAliases(aliasesResult.data ?? []);
      }

      setLoading(false);
    }

    void loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  const suggestions = useMemo(() => {
    const query = normalizeText(value);

    if (!query) return [];

    const matchingAliases = new Map<string, string[]>();

    for (const alias of aliases) {
      const existing = matchingAliases.get(alias.part_id) ?? [];
      existing.push(alias.alias);
      matchingAliases.set(alias.part_id, existing);
    }

    return parts
      .filter((part) => part.category === category)
      .map((part) => {
        const normalizedName = normalizeText(part.name);
        const partAliases = matchingAliases.get(part.id) ?? [];

        const nameStarts = normalizedName.startsWith(query);
        const nameContains = normalizedName.includes(query);
        const aliasStarts = partAliases.some((alias) =>
          normalizeText(alias).startsWith(query)
        );
        const aliasContains = partAliases.some((alias) =>
          normalizeText(alias).includes(query)
        );

        const score = nameStarts
          ? 0
          : aliasStarts
            ? 1
            : nameContains
              ? 2
              : aliasContains
                ? 3
                : 99;

        return {
          ...part,
          score,
          matchedAliases: partAliases.filter((alias) =>
            normalizeText(alias).includes(query)
          ),
        };
      })
      .filter((part) => part.score < 99)
      .sort(
        (a, b) =>
          a.score - b.score ||
          a.name.localeCompare(b.name, "lt")
      )
      .slice(0, 10);
  }, [value, category, parts, aliases]);

  const showSuggestions =
    focused && !selectedId && value.trim().length > 0;

  return (
    <div className="relative">
      <label
        htmlFor="part-catalog-search"
        className="block font-semibold text-[#24333D]"
      >
        Detalės pavadinimas *
      </label>

      <input
        id="part-catalog-search"
        type="text"
        autoComplete="off"
        maxLength={150}
        required
        value={value}
        onChange={(event) => {
          onChange(event.target.value, null);
          setFocused(true);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setFocused(false), 150);
        }}
        placeholder="Pvz., fara, lempa, amortikas..."
        className="mt-2 w-full rounded-xl border border-[#D9E2E0] bg-white p-3 text-[#24333D] outline-none focus:border-[#426A70] focus:ring-2 focus:ring-[#426A70]/15"
      />

      {selectedId && (
        <p className="mt-2 text-sm font-medium text-[#426A70]">
          ✓ Pasirinktas standartinis detalės pavadinimas
        </p>
      )}

      {loading && (
        <p className="mt-2 text-sm text-slate-500">
          Kraunamas detalių katalogas...
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-700">
          Katalogo klaida: {error}
        </p>
      )}

      {showSuggestions && !loading && !error && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[#D9E2E0] bg-white p-2 shadow-xl">
          {suggestions.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">
              Atitikmenų nerasta. Gali įrašyti savo pavadinimą.
            </p>
          ) : (
            suggestions.map((part) => (
              <button
                key={part.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(part.name, part.id);
                  setFocused(false);
                }}
                className="block w-full rounded-lg px-3 py-3 text-left hover:bg-[#EDF4F2]"
              >
                <span className="block font-semibold text-[#24333D]">
                  {part.name}
                </span>

                {part.matchedAliases.length > 0 && (
                  <span className="mt-1 block text-xs text-slate-500">
                    Taip pat ieškoma:{" "}
                    {part.matchedAliases.join(", ")}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
