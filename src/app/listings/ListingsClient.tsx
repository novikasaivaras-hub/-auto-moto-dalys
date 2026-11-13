
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ListingStatus =
  | "active"
  | "reserved"
  | "paid"
  | "shipped"
  | "sold";

type SaleType = "part" | "vehicle";

type ListingImage = {
  id: string;
  image_path: string;
  sort_order: number | null;
};

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  sale_type: SaleType;
  condition: string;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  oem_number: string | null;
  created_at: string;
  view_count: number;
  status: ListingStatus;
  listing_images: ListingImage[];
};

function getPublicStatus(status: ListingStatus) {
  if (status === "active") {
    return {
      label: "Aktyvus",
      className: "bg-emerald-100 text-emerald-800",
      dot: "🟢",
    };
  }

  if (status === "sold") {
    return {
      label: "Parduota",
      className: "bg-slate-200 text-slate-700",
      dot: "⚫",
    };
  }

  return {
    label: "Rezervuota",
    className: "bg-amber-100 text-amber-800",
    dot: "🟠",
  };
}

function ListingPhotos({ listing }: { listing: Listing }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const images = [...(listing.listing_images ?? [])].sort(
    (a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      a.id.localeCompare(b.id)
  );

  function getImageUrl(path: string) {
    return supabase.storage
      .from("listing-images")
      .getPublicUrl(path).data.publicUrl;
  }

  if (images.length === 0) {
    return (
      <Link
        href={`/listings/${listing.id}`}
        className={`mb-4 flex items-center justify-center rounded-xl bg-slate-100 text-6xl ${listing.sale_type === "vehicle" ? "h-80" : "h-52"}`}
      >
        {listing.category === "motorcycle" ? "🏍️" : "🚗"}
      </Link>
    );
  }

  const currentImage = images[activeIndex] ?? images[0];

  return (
    <div className="mb-4">
      <div className="relative overflow-hidden rounded-xl bg-slate-100">
        <Link href={`/listings/${listing.id}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getImageUrl(currentImage.image_path)}
            alt={listing.title}
            className={`w-full object-contain ${listing.sale_type === "vehicle" ? "h-80" : "h-56"}`}
          />
        </Link>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((index) =>
                  index === 0 ? images.length - 1 : index - 1
                )
              }
              aria-label="Ankstesnė nuotrauka"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl font-bold shadow"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveIndex((index) =>
                  index === images.length - 1 ? 0 : index + 1
                )
              }
              aria-label="Kita nuotrauka"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl font-bold shadow"
            >
              ›
            </button>

            <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Rodyti ${index + 1} nuotrauką`}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                activeIndex === index
                  ? "border-[#426A70]"
                  : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(image.image_path)}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlSearch = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("category") ?? "";
  const urlSaleType = searchParams.get("sale_type") ?? "";

  const validUrlCategory =
    urlCategory === "car" || urlCategory === "motorcycle"
      ? urlCategory
      : "";

  const validUrlSaleType =
    urlSaleType === "part" || urlSaleType === "vehicle"
      ? urlSaleType
      : "";

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteBusy, setFavoriteBusy] = useState<string[]>([]);
  const [favoriteError, setFavoriteError] = useState("");

  const [favoriteCounts, setFavoriteCounts] = useState<
    Record<string, number>
  >({});

  const [search, setSearch] = useState(urlSearch);
  const [category, setCategory] = useState(validUrlCategory);
  const [saleType, setSaleType] = useState(validUrlSaleType);
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // AUTO_MOTO_LISTINGS_RESTORE_V2
  const restoreKey = "auto-moto-listings-state-v2";
  const restoredRef = useRef(false);
  const [restorationReady, setRestorationReady] = useState(false);
  const [scrollRestoreY, setScrollRestoreY] = useState<number | null>(null);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const saved = sessionStorage.getItem(restoreKey);

      if (saved) {
        const state = JSON.parse(saved) as {
          path?: string;
          search?: string;
          category?: string;
          saleType?: string;
          manufacturer?: string;
          model?: string;
          year?: string;
          condition?: string;
          minPrice?: string;
          maxPrice?: string;
          sortBy?: string;
          scrollY?: number;
        };

        const currentPath =
          window.location.pathname + window.location.search;

        if (state.path === currentPath) {
          setSearch(state.search ?? "");
          setCategory(state.category ?? "");
          setSaleType(state.saleType ?? "");
          setManufacturer(state.manufacturer ?? "");
          setModel(state.model ?? "");
          setYear(state.year ?? "");
          setCondition(state.condition ?? "");
          setMinPrice(state.minPrice ?? "");
          setMaxPrice(state.maxPrice ?? "");
          setSortBy(state.sortBy ?? "newest");

          if (
            typeof state.scrollY === "number" &&
            Number.isFinite(state.scrollY)
          ) {
            setScrollRestoreY(state.scrollY);
          }
        }
      }
    } catch {
      // Sugadoti duomenys ignoruojami.
    }

    setRestorationReady(true);
  }, []);

  useEffect(() => {
    if (!restorationReady) return;

    const saveState = () => {
      sessionStorage.setItem(
        restoreKey,
        JSON.stringify({
          path: window.location.pathname + window.location.search,
          search,
          category,
          saleType,
          manufacturer,
          model,
          year,
          condition,
          minPrice,
          maxPrice,
          sortBy,
          scrollY: window.scrollY,
        })
      );
    };

    window.addEventListener("scroll", saveState, { passive: true });
    window.addEventListener("pagehide", saveState);

    return () => {
      window.removeEventListener("scroll", saveState);
      window.removeEventListener("pagehide", saveState);
      saveState();
    };
  }, [
    restorationReady,
    search,
    category,
    saleType,
    manufacturer,
    model,
    year,
    condition,
    minPrice,
    maxPrice,
    sortBy,
  ]);
  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      setLoading(true);
      setError("");

      const { data, error: loadError } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          description,
          price,
          category,
          sale_type,
          condition,
          manufacturer,
          model,
          year,
          oem_number,
          created_at,
          view_count,
          status,
          listing_images (
            id,
            image_path,
            sort_order
          )
        `)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
      } else {
        setListings((data ?? []) as Listing[]);
      }

      setLoading(false);
    }

    void loadListings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !authData.user) {
        setUserId("");
        setFavoriteIds([]);
        return;
      }

      const currentUserId = authData.user.id;
      setUserId(currentUserId);

      const { data, error: loadError } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", currentUserId);

      if (cancelled) return;

      if (loadError) {
        console.error(
          "Nepavyko įkelti mėgstamų skelbimų:",
          loadError.message
        );
        setFavoriteError(
          "Nepavyko įkelti mėgstamų skelbimų."
        );
        return;
      }

      setFavoriteIds(
        (data ?? []).map((item) => item.listing_id)
      );
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFavoriteCounts() {
      const { data, error: countError } = await supabase
        .from("favorites")
        .select("listing_id");

      if (cancelled) return;

      if (countError) {
        console.error(
          "Nepavyko įkelti širdelių skaičiaus:",
          countError.message
        );
        return;
      }

      const counts: Record<string, number> = {};

      for (const item of data ?? []) {
        counts[item.listing_id] =
          (counts[item.listing_id] ?? 0) + 1;
      }

      setFavoriteCounts(counts);
    }

    void loadFavoriteCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleFavorite(listingId: string) {
    if (!userId) {
      router.push("/login");
      return;
    }

    if (favoriteBusy.includes(listingId)) return;

    setFavoriteError("");
    setFavoriteBusy((previous) => [
      ...previous,
      listingId,
    ]);

    const isFavorite = favoriteIds.includes(listingId);

    try {
      if (isFavorite) {
        const { error: deleteError } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("listing_id", listingId);

        if (deleteError) throw deleteError;

        setFavoriteIds((previous) =>
          previous.filter((id) => id !== listingId)
        );

        setFavoriteCounts((previous) => ({
          ...previous,
          [listingId]: Math.max(
            0,
            (previous[listingId] ?? 0) - 1
          ),
        }));
      } else {
        const { error: insertError } = await supabase
          .from("favorites")
          .insert({
            user_id: userId,
            listing_id: listingId,
          });

        if (insertError) throw insertError;

        setFavoriteIds((previous) =>
          previous.includes(listingId)
            ? previous
            : [...previous, listingId]
        );

        setFavoriteCounts((previous) => ({
          ...previous,
          [listingId]:
            (previous[listingId] ?? 0) + 1,
        }));
      }
    } catch (err) {
      console.error("Mėgstamų skelbimų klaida:", err);
      setFavoriteError(
        "Nepavyko pakeisti mėgstamo skelbimo. Bandykite dar kartą."
      );
    } finally {
      setFavoriteBusy((previous) =>
        previous.filter((id) => id !== listingId)
      );
    }
  }

  const categoryListings = useMemo(
    () =>
      listings.filter(
        (listing) =>
          (!category || listing.category === category) &&
          (!saleType || listing.sale_type === saleType)
      ),
    [listings, category, saleType]
  );

  const manufacturers = useMemo(
    () =>
      [
        ...new Set(
          categoryListings
            .map((listing) =>
              listing.manufacturer?.trim()
            )
            .filter(
              (value): value is string =>
                Boolean(value)
            )
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [categoryListings]
  );

  const models = useMemo(
    () =>
      [
        ...new Set(
          categoryListings
            .filter(
              (listing) =>
                !manufacturer ||
                listing.manufacturer?.toLowerCase() ===
                  manufacturer.toLowerCase()
            )
            .map((listing) =>
              listing.model?.trim()
            )
            .filter(
              (value): value is string =>
                Boolean(value)
            )
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [categoryListings, manufacturer]
  );

  const years = useMemo(
    () =>
      [
        ...new Set(
          categoryListings
            .filter(
              (listing) =>
                (!manufacturer ||
                  listing.manufacturer?.toLowerCase() ===
                    manufacturer.toLowerCase()) &&
                (!model ||
                  listing.model?.toLowerCase() ===
                    model.toLowerCase())
            )
            .map((listing) => listing.year)
            .filter(
              (value): value is number =>
                value !== null
            )
        ),
      ].sort((a, b) => b - a),
    [categoryListings, manufacturer, model]
  );

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = listings.filter((listing) => {
      const searchableText = [
        listing.title,
        listing.description,
        listing.manufacturer,
        listing.model,
        listing.oem_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const price = Number(listing.price);

      return (
        searchableText.includes(query) &&
        (!saleType ||
          listing.sale_type === saleType) &&
        (!category ||
          listing.category === category) &&
        (!manufacturer ||
          listing.manufacturer?.toLowerCase() ===
            manufacturer.toLowerCase()) &&
        (!model ||
          listing.model?.toLowerCase() ===
            model.toLowerCase()) &&
        (!year ||
          String(listing.year) === year) &&
        (!condition ||
          listing.condition === condition) &&
        (minPrice === "" ||
          price >= Number(minPrice)) &&
        (maxPrice === "" ||
          price <= Number(maxPrice))
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "price_asc") {
        return (
          Number(a.price) - Number(b.price)
        );
      }

      if (sortBy === "price_desc") {
        return (
          Number(b.price) - Number(a.price)
        );
      }

      if (sortBy === "oldest") {
        return (
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
        );
      }

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });
  }, [
    listings,
    search,
    saleType,
    category,
    manufacturer,
    model,
    year,
    condition,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const inputStyle =
    "w-full rounded-xl border border-[#D9E2E0] bg-white p-3 text-[#24333D] outline-none transition-colors focus:border-[#426A70] focus:ring-2 focus:ring-[#426A70]/15";

  useEffect(() => {
    if (!restorationReady || loading || scrollRestoreY === null) {
      return;
    }

    let attempts = 0;
    let frame = 0;

    const restoreScroll = () => {
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

      if (maxScroll >= scrollRestoreY || attempts >= 30) {
        window.scrollTo(0, Math.min(scrollRestoreY, maxScroll));
        setScrollRestoreY(null);
        return;
      }

      attempts += 1;
      frame = window.requestAnimationFrame(restoreScroll);
    };

    frame = window.requestAnimationFrame(restoreScroll);

    return () => window.cancelAnimationFrame(frame);
  }, [restorationReady, loading, scrollRestoreY]);
  const pageTitle =
    saleType === "vehicle"
      ? category === "car"
        ? "Automobiliai"
        : category === "motorcycle"
          ? "Motociklai"
          : "Transporto priemonės"
      : saleType === "part"
        ? category === "car"
          ? "Automobilių dalys"
          : category === "motorcycle"
            ? "Motociklų dalys"
            : "Dalių skelbimai"
        : "Visi skelbimai";

  function clearFilters() {
    setSearch("");
    setSaleType("");
    setCategory("");
    setManufacturer("");
    setModel("");
    setYear("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    router.replace("/listings");
  }

  // AUTO_MOTO_MOBILE_FILTERS_V1
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              {pageTitle}
            </h1>

            <p className="mt-2 text-slate-600">
              Rask tinkamą automobilį, motociklą arba jų dalis
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/favorites"
              className="rounded-xl border border-[#426A70] bg-white px-5 py-3 font-semibold text-[#426A70] transition-colors hover:bg-[#EDF4F2]"
            >
              ❤️ Mano mėgstami
            </Link>

            <Link
              href="/sell"
              className="rounded-xl bg-[#426A70] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#35575D]"
            >
              Įdėti skelbimą
            </Link>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
  {[
    { label: "Visi skelbimai", icon: "📋", type: "", category: "" },
    { label: "Automobiliai", icon: "🚗", type: "vehicle", category: "car" },
    { label: "Motociklai", icon: "🏍️", type: "vehicle", category: "motorcycle" },
    { label: "Dalys", icon: "🔧", type: "part", category: "" },
  ].map((item) => {
    const active =
      saleType === item.type &&
      category === item.category;

    return (
      <button
        key={item.label}
        type="button"
        onClick={() => {
          setSaleType(item.type);
          setCategory(item.category);
          setManufacturer("");
          setModel("");
          setYear("");
        }}
        className={`rounded-2xl border p-4 text-center transition ${
          active
            ? "border-[#426A70] bg-[#426A70] text-white"
            : "border-[#D9E2E0] bg-white text-[#24333D] hover:border-[#426A70]"
        }`}
      >
        <span className="block text-3xl">{item.icon}</span>
        <span className="mt-2 block text-sm font-bold">{item.label}</span>
      </button>
    );
  })}
</section>
<section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            Skelbimų paieška
          </h2>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Pavadinimas, markė, modelis arba OEM kodas..."
            className={`${inputStyle} mb-4`}
          />

          {/* AUTO_MOTO_MOBILE_FILTERS_V1 */}
          <button
            type="button"
            aria-expanded={mobileFiltersOpen}
            aria-controls="auto-moto-extra-filters"
            onClick={() => setMobileFiltersOpen((open) => !open)}
            className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#D9E2E0] bg-[#F5F7F6] px-4 py-3 text-sm font-bold text-[#24333D] md:hidden"
          >
            <span>🔎 {mobileFiltersOpen ? "Slėpti filtrus" : "Rodyti filtrus"}</span>
            <span aria-hidden="true">{mobileFiltersOpen ? "▲" : "▼"}</span>
          </button>

          <div
            id="auto-moto-extra-filters"
            className={`${mobileFiltersOpen ? "grid" : "hidden"} gap-4 md:grid md:grid-cols-4`}
          >
            <label className="text-sm font-semibold text-slate-700">
              Skelbimo tipas
              <select
                value={saleType}
                onChange={(event) => {
                  setSaleType(event.target.value);
                  setManufacturer("");
                  setModel("");
                  setYear("");
                }}
                className={`${inputStyle} mt-2`}
              >
                <option value="">Visi skelbimai</option>
                <option value="vehicle">
                  Transporto priemonės
                </option>
                <option value="part">
                  Dalys ir komplektai
                </option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Transporto priemonė
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setManufacturer("");
                  setModel("");
                  setYear("");
                }}
                className={`${inputStyle} mt-2`}
              >
                <option value="">Visos</option>
                <option value="car">
                  Automobiliai
                </option>
                <option value="motorcycle">
                  Motociklai
                </option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Markė
              <select
                value={manufacturer}
                onChange={(event) => {
                  setManufacturer(event.target.value);
                  setModel("");
                  setYear("");
                }}
                className={`${inputStyle} mt-2`}
              >
                <option value="">
                  Visos markės
                </option>

                {manufacturers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Modelis
              <select
                value={model}
                onChange={(event) => {
                  setModel(event.target.value);
                  setYear("");
                }}
                className={`${inputStyle} mt-2`}
              >
                <option value="">
                  Visi modeliai
                </option>

                {models.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Metai
              <select
                value={year}
                onChange={(event) =>
                  setYear(event.target.value)
                }
                className={`${inputStyle} mt-2`}
              >
                <option value="">
                  Visi metai
                </option>

                {years.map((value) => (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Būklė
              <select
                value={condition}
                onChange={(event) =>
                  setCondition(event.target.value)
                }
                className={`${inputStyle} mt-2`}
              >
                <option value="">
                  Visos būklės
                </option>
                <option value="new">
                  Nauja
                </option>
                <option value="used">
                  Naudota
                </option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Kaina nuo (€)
              <input
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(event) =>
                  setMinPrice(event.target.value)
                }
                placeholder="Nuo"
                className={`${inputStyle} mt-2`}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Kaina iki (€)
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(event) =>
                  setMaxPrice(event.target.value)
                }
                placeholder="Iki"
                className={`${inputStyle} mt-2`}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Rikiavimas
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value)
                }
                className={`${inputStyle} mt-2`}
              >
                <option value="newest">
                  Naujausi pirmiausia
                </option>
                <option value="oldest">
                  Seniausi pirmiausia
                </option>
                <option value="price_asc">
                  Pigiausi pirmiausia
                </option>
                <option value="price_desc">
                  Brangiausi pirmiausia
                </option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Rasta skelbimų:{" "}
              <strong>{filteredListings.length}</strong>
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="font-semibold text-[#426A70] hover:underline"
            >
              Išvalyti filtrus
            </button>
          </div>
        </section>

        {favoriteError && (
          <p className="mb-5 rounded-lg bg-red-100 p-4 text-red-800">
            {favoriteError}
          </p>
        )}

        {loading && <p>Įkeliami skelbimai...</p>}

        {error && (
          <p className="rounded-lg bg-red-100 p-4 text-red-800">
            Klaida: {error}
          </p>
        )}

        {!loading &&
          !error &&
          filteredListings.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-slate-600">
              Pagal pasirinktus filtrus skelbimų nerasta.
            </p>
          )}

        {!loading && !error && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => {
              const isFavorite =
                favoriteIds.includes(listing.id);

              const isBusy =
                favoriteBusy.includes(listing.id);

              const likes =
                favoriteCounts[listing.id] ?? 0;

              const publicStatus =
                getPublicStatus(listing.status);

              return (
                <article
                  key={listing.id}
                  data-clickable-listing-card="true"
                  role="link"
                  tabIndex={0}
                  aria-label={`Atidaryti skelbimą: ${listing.title}`}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("a, button, input, select, textarea")) {
                      return;
                    }
                    router.push(`/listings/${listing.id}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/listings/${listing.id}`);
                    }
                  }}
                  className="flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#E3E9E7] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#426A70]"
                >
                  <div className="relative">
                    <ListingPhotos listing={listing} />

                    <button
                      type="button"
                      onClick={() =>
                        void toggleFavorite(listing.id)
                      }
                      disabled={isBusy}
                      aria-label={
                        isFavorite
                          ? "Pašalinti iš mėgstamų"
                          : "Pridėti prie mėgstamų"
                      }
                      aria-pressed={isFavorite}
                      title={
                        isFavorite
                          ? "Pašalinti iš mėgstamų"
                          : "Pridėti prie mėgstamų"
                      }
                      className={`absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl shadow-md transition hover:scale-105 disabled:opacity-50 ${
                        isFavorite
                          ? "text-[#426A70]"
                          : "text-slate-400"
                      }`}
                    >
                      {isFavorite ? "♥" : "♡"}
                    </button>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${publicStatus.className}`}
                    >
                      <span aria-hidden="true">
                        {publicStatus.dot}
                      </span>
                      {publicStatus.label}
                    </span>

                    <span className="rounded-full bg-[#EDF4F2] px-3 py-1 text-xs font-semibold text-[#426A70]">
                      {listing.sale_type === "vehicle"
                        ? listing.category === "motorcycle"
                          ? "Motociklas"
                          : "Automobilis"
                        : listing.category === "motorcycle"
                          ? "Motociklo dalis"
                          : "Automobilio dalis"}
                    </span>
                  </div>

                  <Link
                    href={`/listings/${listing.id}`}
                    className="mb-2 block text-xl font-semibold text-[#24333D] transition-colors hover:text-[#426A70] hover:underline"
                  >
                    {listing.title}
                  </Link>

                  <p className="mb-3 text-2xl font-bold tracking-tight text-[#24333D]">
                    {Number(listing.price).toFixed(2)} €
                  </p>

                  <p className="mb-3 text-sm text-slate-500">
                    {listing.condition === "new"
                      ? "Nauja"
                      : "Naudota"}
                    {" · "}
                    {[
                      listing.manufacturer,
                      listing.model,
                      listing.year,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </p>

                  {listing.description && (
                    <p className="mb-3 whitespace-pre-wrap text-slate-700">
                      {listing.description}
                    </p>
                  )}

                  {listing.sale_type !== "vehicle" && listing.oem_number && (
                    <p className="text-sm text-slate-500">
                      OEM: {listing.oem_number}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-[#EDF1EF] pt-3 text-xs text-slate-500">
                    <span
                      className="inline-flex items-center gap-1.5"
                      title="Skelbimo peržiūros"
                    >
                      <span aria-hidden="true">👁</span>
                      <span>
                        {listing.view_count ?? 0} peržiūros
                      </span>
                    </span>

                    <span
                      className="inline-flex items-center gap-1.5"
                      title="Kiek žmonių pažymėjo mėgstamu"
                    >
                      <span aria-hidden="true">♡</span>
                      <span>{likes} patinka</span>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <Link
          href="/"
          className="mt-10 inline-block font-semibold text-[#426A70]"
        >
          ← Grįžti į pradžią
        </Link>
      </div>
    </main>
  );
}
