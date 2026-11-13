"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type TopPart = {
  listing_id: string;
  title: string;
  manufacturer: string | null;
  model: string | null;
  total_views: number;
};

export default function SellerTopPartsStats() {
  // PARDAVEJO STATISTIKA SUSKLEIDZIAMA V1
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<7 | 30>(30);
  // PIRKEJU SUSIDOMEJIMO STATISTIKA V1
  const [engagement, setEngagement] = useState<
    {
      listing_id: string;
      title: string;
      total_views: number;
      total_favorites: number;
      total_inquiries: number;
    }[]
  >([]);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [engagementError, setEngagementError] = useState("");
  // MARKIU IR MODELIU STATISTIKA V2
  const [popularity, setPopularity] = useState<
    {
      group_type: string;
      group_name: string;
      total_views: number;
      listing_count: number;
    }[]
  >([]);
  const [popularityLoading, setPopularityLoading] = useState(true);
  const [popularityError, setPopularityError] = useState("");
  const [items, setItems] = useState<TopPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !authData.user) {
        setIsLoggedIn(false);
        setItems([]);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      setEngagementLoading(true);
      setEngagementError("");

      const { data: engagementData, error: engagementQueryError } =
        await supabase.rpc("get_my_parts_engagement", {
          p_days: period,
        });

      if (cancelled) return;

      if (engagementQueryError) {
        console.error("Susidomėjimo statistikos klaida:", engagementQueryError);
        setEngagementError("Nepavyko įkelti susidomėjimo statistikos.");
        setEngagement([]);
      } else {
        setEngagement(engagementData ?? []);
      }

      setEngagementLoading(false);

      setPopularityLoading(true);
      setPopularityError("");

      const { data: popularityData, error: popularityQueryError } =
        await supabase.rpc("get_my_parts_popularity", {
          p_days: period,
        });

      if (cancelled) return;

      if (popularityQueryError) {
        console.error("Markių ir modelių klaida:", popularityQueryError);
        setPopularityError("Nepavyko įkelti markių ir modelių.");
        setPopularity([]);
      } else {
        setPopularity(popularityData ?? []);
      }

      setPopularityLoading(false);

      const { data, error: queryError } = await supabase.rpc(
        "get_my_top_parts",
        { p_days: period }
      );

      if (cancelled) return;

      if (queryError) {
        setItems([]);
        setError("Nepavyko įkelti TOP detalių statistikos.");
        console.error("TOP detalių klaida:", queryError);
      } else {
        setItems((data ?? []) as TopPart[]);
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [period]);

  if (!isLoggedIn && !loading) return null;

  return (
    <section className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50"
      >
        <div>
          <h2 className="text-lg font-black text-[#24333D]">
            📊 Pardavėjo statistika
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            TOP 10 žiūrimiausių detalių
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-[#426A70]">
          {expanded ? "▲ Suskleisti" : "▼ Išskleisti"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#24333D]">
            📊 TOP 10 žiūrimiausių detalių
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Tavo detalių skelbimų peržiūros pagal dienas.
          </p>
        </div>

        <div className="flex gap-2">
          {([7, 30] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriod(days)}
              aria-pressed={period === days}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${
                period === days
                  ? "bg-[#426A70] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {days} d.
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">
          Kraunama statistika...
        </p>
      ) : error ? (
        <p role="alert" className="mt-5 text-sm text-red-700">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm text-slate-600">
          Detalių skelbimų kol kas nėra.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Detalė</th>
                <th className="px-3 py-3">Markė / modelis</th>
                <th className="px-3 py-3 text-right">Peržiūros</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.listing_id}
                  className="border-b border-slate-100"
                >
                  <td className="px-3 py-3 font-bold">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/listings/${item.listing_id}`}
                      className="font-semibold text-[#426A70] hover:underline"
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {[item.manufacturer, item.model]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </td>
                  <td className="px-3 py-3 text-right font-bold">
                    {item.total_views}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TOP MARKES IR MODELIAI */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(["brand", "model"] as const).map((groupType) => {
          const rows = popularity.filter(
            (item) => item.group_type === groupType
          );

          return (
            <div
              key={groupType}
              className="rounded-xl border border-slate-200 p-4"
            >
              <h3 className="mb-3 font-bold text-[#24333D]">
                {groupType === "brand"
                  ? "🚗 TOP 10 markių"
                  : "🔧 TOP 10 modelių"}
              </h3>

              {popularityLoading ? (
                <p className="text-sm text-slate-500">
                  Kraunama...
                </p>
              ) : popularityError ? (
                <p className="text-sm text-red-700">
                  {popularityError}
                </p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Duomenų kol kas nėra.
                </p>
              ) : (
                <div className="space-y-2">
                  {rows.map((item, index) => (
                    <div
                      key={`${groupType}-${item.group_name}`}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="mr-2 text-slate-400">
                          {index + 1}.
                        </span>
                        <span className="font-medium">
                          {item.group_name}
                        </span>
                      </span>
                      <span className="shrink-0 font-bold text-[#426A70]">
                        {item.total_views}
                        <span className="ml-1 text-xs font-normal text-slate-500">
                          perž.
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* PARDAVEJO SUVESTINE V1 */}
      <div className="mt-6">
        <h3 className="mb-3 text-lg font-black text-[#24333D]">
          📊 Bendroji suvestinė
        </h3>

        {engagementLoading ? (
          <p className="text-sm text-slate-500">
            Kraunama suvestinė...
          </p>
        ) : engagementError ? (
          <p role="alert" className="text-sm text-red-700">
            {engagementError}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Peržiūros",
                value: engagement.reduce(
                  (sum, item) => sum + Number(item.total_views || 0),
                  0
                ),
                icon: "👁️",
              },
              {
                label: "Pamėgimai",
                value: engagement.reduce(
                  (sum, item) => sum + Number(item.total_favorites || 0),
                  0
                ),
                icon: "❤️",
              },
              {
                label: "Užklausos",
                value: engagement.reduce(
                  (sum, item) => sum + Number(item.total_inquiries || 0),
                  0
                ),
                icon: "💬",
              },
              {
                label: "Detalių skelbimai",
                value: engagement.length,
                icon: "📦",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-xl">{stat.icon}</div>
                <div className="mt-2 text-2xl font-black text-[#24333D]">
                  {stat.value.toLocaleString("lt-LT")}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Peržiūros, pamėgimai ir užklausos skaičiuojami pagal
          pasirinktą laikotarpį. Skelbimų skaičius rodomas bendras.
        </p>
      </div>
      {/* PIRKEJU SUSIDOMEJIMAS */}
      <div className="mt-7">
        <h3 className="text-lg font-black text-[#24333D]">
          ❤️ Pirkėjų susidomėjimas
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Peržiūros, nauji pamėgimai ir pradėti pokalbiai per pasirinktą laikotarpį.
        </p>

        {engagementLoading ? (
          <p className="mt-4 text-sm text-slate-500">Kraunama...</p>
        ) : engagementError ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {engagementError}
          </p>
        ) : engagement.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Detalių skelbimų kol kas nėra.
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="px-3 py-3">Detalė</th>
                    <th className="px-3 py-3 text-right">Peržiūros</th>
                    <th className="px-3 py-3 text-right">Pamėgimai</th>
                    <th className="px-3 py-3 text-right">Užklausos</th>
                  </tr>
                </thead>
                <tbody>
                  {engagement.slice(0, 10).map((item) => (
                    <tr key={item.listing_id} className="border-b border-slate-100">
                      <td className="px-3 py-3">
                        <Link
                          href={`/listings/${item.listing_id}`}
                          className="font-semibold text-[#426A70] hover:underline"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right">{item.total_views}</td>
                      <td className="px-3 py-3 text-right">{item.total_favorites}</td>
                      <td className="px-3 py-3 text-right">{item.total_inquiries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {([
                { key: "total_favorites", title: "❤️ TOP 10 pamėgtų detalių" },
                { key: "total_inquiries", title: "💬 TOP 10 užklausų" },
              ] as const).map(({ key, title }) => (
                <div key={key} className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 font-bold text-[#24333D]">{title}</h4>
                  <div className="space-y-2">
                    {[...engagement]
                      .sort((a, b) => b[key] - a[key])
                      .slice(0, 10)
                      .map((item, index) => (
                        <div
                          key={item.listing_id}
                          className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 text-sm"
                        >
                          <Link
                            href={`/listings/${item.listing_id}`}
                            className="min-w-0 truncate hover:underline"
                          >
                            <span className="mr-2 text-slate-400">{index + 1}.</span>
                            {item.title}
                          </Link>
                          <span className="shrink-0 font-bold text-[#426A70]">
                            {item[key]}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Statistika kaupiama nuo dienos peržiūrų
        registravimo įjungimo. Ankstesnės peržiūros
        į šį laikotarpį neįtraukiamos.
      </p>
        </div>
      )}
    </section>
  );
}