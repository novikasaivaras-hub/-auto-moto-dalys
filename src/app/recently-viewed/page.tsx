"use client";

// AUTO_MOTO_RECENT_PAGE_V1

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "auto-moto-recently-viewed-v1";

type RecentListing = {
  id: string;
  title: string;
  price: number;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
};

export default function RecentlyViewedPage() {
  const [items, setItems] = useState<RecentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecent() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed: unknown = JSON.parse(raw || "[]");

        const ids = Array.isArray(parsed)
          ? parsed.filter(
              (value): value is string => typeof value === "string"
            ).slice(0, 20)
          : [];

        if (ids.length === 0) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("listings")
          .select("id, title, price, category, manufacturer, model")
          .in("id", ids);

        if (cancelled) return;

        if (error) {
          setMessage("Nepavyko įkelti skelbimų.");
        } else {
          const listings = (data || []) as RecentListing[];
          const byId = new Map(listings.map((item) => [item.id, item]));

          setItems(
            ids
              .map((id) => byId.get(id))
              .filter((item): item is RecentListing => Boolean(item))
          );
        }
      } catch {
        if (!cancelled) {
          setMessage("Nepavyko perskaityti peržiūrų istorijos.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRecent();

    return () => {
      cancelled = true;
    };
  }, []);

  function clearHistory() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setItems([]);
      setMessage("");
    } catch {
      setMessage("Nepavyko išvalyti istorijos.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/listings"
              className="text-sm font-semibold text-[#426A70] hover:underline"
            >
              ← Visi skelbimai
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-[#24333D]">
              Neseniai peržiūrėti skelbimai
            </h1>
            <p className="mt-2 text-slate-600">
              Iki 20 paskutinių šioje naršyklėje atidarytų skelbimų.
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-xl border border-[#D9E2E0] bg-white px-4 py-3 font-semibold text-[#24333D] hover:bg-slate-50"
            >
              Išvalyti istoriją
            </button>
          )}
        </div>

        {loading && (
          <p className="text-slate-600">Įkeliama istorija...</p>
        )}

        {!loading && message && (
          <p className="mb-5 text-red-700">{message}</p>
        )}

        {!loading && items.length === 0 && !message && (
          <div className="rounded-2xl border border-[#E3E9E7] bg-white p-8">
            <p className="text-lg font-semibold text-[#24333D]">
              Peržiūrėtų skelbimų dar nėra
            </p>
            <p className="mt-2 text-slate-600">
              Atidaryk kelis skelbimus ir jie atsiras čia.
            </p>
            <Link
              href="/listings"
              className="mt-5 inline-block rounded-xl bg-[#426A70] px-5 py-3 font-semibold text-white"
            >
              Naršyti skelbimus
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                className="block rounded-2xl border border-[#E3E9E7] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <h2 className="text-lg font-bold text-[#24333D]">
                  {item.title}
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  {[item.manufacturer, item.model, item.category]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <p className="mt-4 text-xl font-bold text-[#426A70]">
                  {Number(item.price).toLocaleString("lt-LT")} €
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}