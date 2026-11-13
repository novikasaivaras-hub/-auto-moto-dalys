
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type WarehouseLocation = {
  id: string;
  code: string;
  description: string | null;
};

type WarehousePart = {
  id: string;
  title: string;
  internal_code: string | null;
  external_id: string | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  price: number | null;
  status: string | null;
  warehouse_location: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktyvi",
  reserved: "Rezervuota",
  paid: "Apmokėta",
  shipped: "Išsiųsta",
  sold: "Parduota",
};

const PAGE_SIZE = 100;

export default function WarehouseByLocationPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [parts, setParts] = useState<WarehousePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [filter, setFilter] = useState("");

  const loadLocations = useCallback(async (sellerId: string) => {
    const { data, error } = await supabase
      .from("warehouse_locations")
      .select("id, code, description")
      .eq("seller_id", sellerId)
      .order("code", { ascending: true });

    if (error) {
      setMessage("Nepavyko gauti sandėlio vietų: " + error.message);
      return;
    }

    setLocations((data ?? []) as WarehouseLocation[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !user) {
        setMessage("Norėdamas naudotis sandėliu, prisijunk.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadLocations(user.id);

      if (active) setLoading(false);
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [loadLocations]);

  async function searchByLocation(locationCode: string) {
    if (!userId || searching) return;

    setSelectedLocation(locationCode);
    setParts([]);
    setFilter("");
    setMessage("");
    setHasSearched(false);

    if (!locationCode) return;

    setSearching(true);

    try {
      const allParts: WarehousePart[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from("listings")
          .select(
            `
            id,
            title,
            internal_code,
            external_id,
            manufacturer,
            model,
            year,
            price,
            status,
            warehouse_location
            `
          )
          .eq("seller_id", userId)
          .eq("warehouse_location", locationCode)
          .order("title", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        const batch = (data ?? []) as WarehousePart[];
        allParts.push(...batch);

        if (batch.length < PAGE_SIZE) break;

        from += PAGE_SIZE;
      }

      setParts(allParts);
      setHasSearched(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? "Paieškos klaida: " + error.message
          : "Nepavyko surasti detalių."
      );
    } finally {
      setSearching(false);
    }
  }

  const visibleParts = parts.filter((part) => {
    const search = filter.trim().toLocaleLowerCase();

    if (!search) return true;

    return [
      part.title,
      part.internal_code,
      part.external_id,
      part.manufacturer,
      part.model,
      part.year,
    ]
      .filter((value) => value !== null && value !== undefined)
      .some((value) =>
        String(value).toLocaleLowerCase().includes(search)
      );
  });

  const selectedLocationInfo = locations.find(
    (location) => location.code === selectedLocation
  );

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-7">
        <div>
          <Link
            href="/warehouse"
            className="text-sm font-semibold text-[#426A70] hover:underline"
          >
            ← Grįžti į mano sandėlį
          </Link>

          <h1 className="mt-5 text-3xl font-black text-[#24333D]">
            Detalės pagal sandėlio vietą
          </h1>

          <p className="mt-2 text-slate-600">
            Pasirink sandėlio vietą ir matyk visas joje
            saugomas detales.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-slate-600">
            Kraunamos sandėlio vietos...
          </div>
        ) : !userId ? (
          <div className="rounded-2xl bg-white p-8 text-slate-700">
            Norėdamas naudotis sandėliu, pirmiausia prisijunk.
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold text-[#24333D]">
                📦 Pasirink sandėlio vietą
              </h2>

              <label className="mt-5 block font-semibold text-[#24333D]">
                Sandėlio vieta

                <select
                  value={selectedLocation}
                  onChange={(event) =>
                    void searchByLocation(event.target.value)
                  }
                  disabled={searching}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#24333D] outline-none focus:border-[#426A70] disabled:opacity-50"
                >
                  <option value="">— Pasirink vietą —</option>

                  {locations.map((location) => (
                    <option key={location.id} value={location.code}>
                      {location.code}
                      {location.description
                        ? ` – ${location.description}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedLocationInfo?.description && (
                <p className="mt-3 text-sm text-slate-600">
                  {selectedLocationInfo.description}
                </p>
              )}

              {searching && (
                <p className="mt-4 text-sm text-[#426A70]">
                  Ieškoma detalių...
                </p>
              )}

              {message && (
                <div
                  role="status"
                  className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                  {message}
                </div>
              )}

              {hasSearched && !searching && (
                <div className="mt-5 rounded-xl bg-[#EDF4F2] p-5">
                  <p className="text-sm font-semibold text-[#426A70]">
                    Sandėlio vieta
                  </p>

                  <p className="mt-1 text-2xl font-black text-[#24333D]">
                    {selectedLocation}
                  </p>

                  <p className="mt-3 text-sm text-slate-600">
                    Rasta detalių:
                  </p>

                  <p className="text-3xl font-black text-[#24333D]">
                    {parts.length}
                  </p>
                </div>
              )}
            </section>

            {hasSearched && !searching && (
              <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-[#24333D]">
                    🔧 Sandėlio detalės
                  </h2>

                  <button
                    type="button"
                    onClick={() =>
                      void searchByLocation(selectedLocation)
                    }
                    className="rounded-xl border border-[#9BB5B7] px-4 py-2 text-sm font-semibold text-[#426A70] hover:bg-[#EDF4F2]"
                  >
                    Atnaujinti sąrašą
                  </button>
                </div>

                {parts.length > 0 && (
                  <label className="mt-5 block font-semibold text-[#24333D]">
                    Ieškoti tarp rastų detalių

                    <input
                      type="search"
                      value={filter}
                      onChange={(event) =>
                        setFilter(event.target.value)
                      }
                      placeholder="AMD kodas, pavadinimas, modelis..."
                      className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-[#24333D] outline-none focus:border-[#426A70]"
                    />
                  </label>
                )}

                {parts.length === 0 ? (
                  <div className="mt-5 rounded-xl bg-amber-50 p-5 text-amber-900">
                    Šioje sandėlio vietoje detalių dar nėra.
                  </div>
                ) : visibleParts.length === 0 ? (
                  <div className="mt-5 rounded-xl bg-amber-50 p-5 text-amber-900">
                    Pagal įvestą tekstą detalių nerasta.
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    <p className="text-sm text-slate-500">
                      Rodoma: {visibleParts.length} iš {parts.length}
                    </p>

                    {visibleParts.map((part) => (
                      <article
                        key={part.id}
                        className="rounded-xl border border-slate-200 bg-[#FBFCFC] p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-black text-[#24333D]">
                              {part.title}
                            </h3>

                            <p className="mt-2 text-sm text-slate-600">
                              {[
                                part.manufacturer,
                                part.model,
                                part.year,
                              ]
                                .filter(
                                  (value) =>
                                    value !== null &&
                                    value !== ""
                                )
                                .join(" · ") ||
                                "Automobilis nenurodytas"}
                            </p>
                          </div>

                          <span className="rounded-full bg-[#EDF4F2] px-3 py-2 text-sm font-bold text-[#426A70]">
                            {STATUS_LABELS[part.status ?? ""] ??
                              part.status ??
                              "Nenurodyta"}
                          </span>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              AMD kodas
                            </p>
                            <p className="mt-1 font-bold text-[#24333D]">
                              {part.internal_code || "Nėra"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              RRR / išorinis ID
                            </p>
                            <p className="mt-1 font-bold text-[#24333D]">
                              {part.external_id || "Nėra"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Kaina
                            </p>
                            <p className="mt-1 font-bold text-[#24333D]">
                              {part.price !== null
                                ? `${Number(part.price).toFixed(2)} €`
                                : "Nenurodyta"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              Sandėlio vieta
                            </p>
                            <p className="mt-1 font-bold text-[#24333D]">
                              {part.warehouse_location || "Nepriskirta"}
                            </p>
                          </div>
                        </div>

                        <Link
                          href={`/my-listings/${part.id}/edit`}
                          className="mt-5 inline-block rounded-xl bg-[#426A70] px-5 py-3 font-bold text-white hover:bg-[#35565B]"
                        >
                          ✏️ Redaguoti detalę
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
