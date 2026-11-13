
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PartQrLabel from "@/components/PartQrLabel";
import SellerTopPartsStats from "@/components/SellerTopPartsStats";

type ListingStatus =
  | "active"
  | "reserved"
  | "paid"
  | "shipped"
  | "sold";

type StatusFilter = ListingStatus | "all";

type ListingImage = {
  id: string;
  image_path: string;
  sort_order: number | null;
};

type Listing = {
  id: string;
  sale_type: "part" | "vehicle";
  title: string;
  price: number;
  category: string;
  condition: string;
  manufacturer: string | null;
  model: string | null;
  vehicle_generation: string | null;
  year: number | null;
  oem_number: string | null;
  warehouse_location: string | null;
  internal_code: string | null;
  created_at: string;
  view_count: number;
  status: ListingStatus;
  listing_images: ListingImage[];
};

const STATUS_OPTIONS: {
  value: ListingStatus;
  label: string;
}[] = [
  { value: "active", label: "📦 Sandėlyje" },
  { value: "reserved", label: "🟠 Rezervuota" },
  { value: "paid", label: "💳 Apmokėta" },
  { value: "shipped", label: "🚚 Išsiųsta" },
  { value: "sold", label: "✅ Parduota" },
];

function isStatusFilter(
  value: string | null
): value is StatusFilter {
  return (
    value === "all" ||
    STATUS_OPTIONS.some(
      (option) => option.value === value
    )
  );
}

function getPublicStatus(status: ListingStatus) {
  if (status === "active") return "Aktyvus";
  if (status === "sold") return "Parduota";
  return "Rezervuota";
}

function getStatusColor(status: ListingStatus) {
  if (status === "active") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "sold") {
    return "bg-slate-200 text-slate-700";
  }

  return "bg-amber-100 text-amber-800";
}

function formatPrice(price: number) {
  return Number(price).toLocaleString("lt-LT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function MyListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFromUrl = searchParams.get("status");

  const selectedFilter: StatusFilter = isStatusFilter(
    statusFromUrl
  )
    ? statusFromUrl
    : "all";

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState<
    string | null
  >(null);

  const [listingToDelete, setListingToDelete] =
    useState<Listing | null>(null);

  const [listingForQr, setListingForQr] =
    useState<Listing | null>(null);

  const [savingStatusId, setSavingStatusId] = useState<
    string | null
  >(null);

  const [statusMessage, setStatusMessage] = useState<
    Record<string, string>
  >({});

  const [favoriteCounts, setFavoriteCounts] = useState<
    Record<string, number>
  >({});

  const [favoritesWarning, setFavoritesWarning] =
    useState("");

  // --------------------------------------------
  // MANO SKELBIMŲ ĮKĖLIMAS
  // --------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadMyListings() {
      setLoading(true);
      setError("");
      setFavoritesWarning("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !authData.user) {
        setIsLoggedIn(false);
        setListings([]);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const { data, error: listingsError } =
        await supabase
          .from("listings")
          .select(`
            id,
            sale_type,
            title,
            price,
            category,
            condition,
            manufacturer,
            model,
            vehicle_generation,
            year,
            oem_number,
            warehouse_location,
            internal_code,
            created_at,
            view_count,
            status,
            listing_images (
              id,
              image_path,
              sort_order
            )
          `)
          .eq("seller_id", authData.user.id)
          .order("created_at", {
            ascending: false,
          });

      if (cancelled) return;

      if (listingsError) {
        setError(
          "Nepavyko įkelti tavo skelbimų: " +
            listingsError.message
        );
        setLoading(false);
        return;
      }

      const myListings = (data ?? []) as Listing[];

      setListings(myListings);

      if (myListings.length > 0) {
        const listingIds = myListings.map(
          (listing) => listing.id
        );

        const {
          data: favoritesData,
          error: favoritesError,
        } = await supabase
          .from("favorites")
          .select("listing_id")
          .in("listing_id", listingIds);

        if (cancelled) return;

        if (favoritesError) {
          console.error(
            "Širdelių skaičiavimo klaida:",
            favoritesError
          );

          setFavoritesWarning(
            "Širdelių statistikos nepavyko įkelti."
          );

          setFavoriteCounts({});
        } else {
          const counts: Record<string, number> = {};

          for (const item of favoritesData ?? []) {
            counts[item.listing_id] =
              (counts[item.listing_id] ?? 0) + 1;
          }

          setFavoriteCounts(counts);
        }
      } else {
        setFavoriteCounts({});
      }

      setLoading(false);
    }

    void loadMyListings();

    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------------------------------
  // STATISTIKA
  // --------------------------------------------

  const totalViews = useMemo(
    () =>
      listings.reduce(
        (sum, listing) =>
          sum + (listing.view_count ?? 0),
        0
      ),
    [listings]
  );

  const totalLikes = useMemo(
    () =>
      listings.reduce(
        (sum, listing) =>
          sum + (favoriteCounts[listing.id] ?? 0),
        0
      ),
    [listings, favoriteCounts]
  );

  const partsCount = useMemo(
    () =>
      listings.filter(
        (listing) => listing.sale_type !== "vehicle"
      ).length,
    [listings]
  );

  const vehiclesCount = useMemo(
    () =>
      listings.filter(
        (listing) => listing.sale_type === "vehicle"
      ).length,
    [listings]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<ListingStatus, number> = {
      active: 0,
      reserved: 0,
      paid: 0,
      shipped: 0,
      sold: 0,
    };

    for (const listing of listings) {
      if (listing.status in counts) {
        counts[listing.status] += 1;
      }
    }

    return counts;
  }, [listings]);

  const filteredListings = useMemo(() => {
    if (selectedFilter === "all") {
      return listings;
    }

    return listings.filter(
      (listing) => listing.status === selectedFilter
    );
  }, [listings, selectedFilter]);

  const selectedFilterLabel =
    selectedFilter === "all"
      ? "Visi skelbimai"
      : STATUS_OPTIONS.find(
          (option) => option.value === selectedFilter
        )?.label ?? "Visi skelbimai";

  // --------------------------------------------
  // BŪSENŲ FILTRAVIMAS
  // --------------------------------------------

  function changeFilter(filter: StatusFilter) {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    if (filter === "all") {
      params.delete("status");
    } else {
      params.set("status", filter);
    }

    const query = params.toString();

    router.replace(
      query
        ? `/my-listings?${query}`
        : "/my-listings",
      { scroll: false }
    );
  }

  // --------------------------------------------
  // NUOTRAUKŲ NUORODOS
  // --------------------------------------------

  function getImageUrl(path: string) {
    return supabase.storage
      .from("listing-images")
      .getPublicUrl(path).data.publicUrl;
  }

  // --------------------------------------------
  // SKELBIMO BŪSENOS KEITIMAS
  // --------------------------------------------

  async function changeListingStatus(
    listing: Listing,
    newStatus: ListingStatus
  ) {
    if (savingStatusId || deletingId) return;
    if (listing.status === newStatus) return;

    setSavingStatusId(listing.id);

    setStatusMessage((previous) => ({
      ...previous,
      [listing.id]: "",
    }));

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Norėdamas keisti būseną, prisijunk."
        );
      }

      const {
        data: updatedListing,
        error: updateError,
      } = await supabase
        .from("listings")
        .update({ status: newStatus })
        .eq("id", listing.id)
        .eq("seller_id", authData.user.id)
        .select("id, status")
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!updatedListing) {
        throw new Error(
          "Būsenos pakeisti nepavyko. " +
            "Patikrink prieigos teises."
        );
      }

      setListings((previous) =>
        previous.map((item) =>
          item.id === listing.id
            ? {
                ...item,
                status:
                  updatedListing.status as ListingStatus,
              }
            : item
        )
      );

      setStatusMessage((previous) => ({
        ...previous,
        [listing.id]: "✓ Būsena išsaugota",
      }));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Nežinoma klaida.";

      setStatusMessage((previous) => ({
        ...previous,
        [listing.id]: "Klaida: " + message,
      }));
    } finally {
      setSavingStatusId(null);
    }
  }

  // --------------------------------------------
  // SKELBIMO TRYNIMAS
  // --------------------------------------------

  async function deleteListing() {
    if (!listingToDelete || deletingId) return;

    const listingId = listingToDelete.id;

    setDeletingId(listingId);
    setError("");

    let photosDeleted = false;

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Norėdamas ištrinti skelbimą, prisijunk."
        );
      }

      const userId = authData.user.id;

      const {
        data: listingData,
        error: listingError,
      } = await supabase
        .from("listings")
        .select(`
          id,
          seller_id,
          listing_images (
            id,
            image_path
          )
        `)
        .eq("id", listingId)
        .eq("seller_id", userId)
        .single();

      if (listingError || !listingData) {
        throw new Error(
          "Skelbimas nerastas arba neturi teisės " +
            "jo ištrinti."
        );
      }

      const images = (
        listingData.listing_images ?? []
      ) as ListingImage[];

      const imagePaths = [
        ...new Set(
          images
            .map((image) => image.image_path)
            .filter(
              (path): path is string => Boolean(path)
            )
        ),
      ];

      const expectedPrefix =
        `${userId}/${listingId}/`;

      const invalidPath = imagePaths.some(
        (path) =>
          !path.startsWith(expectedPrefix) ||
          path.includes("..")
      );

      if (invalidPath) {
        throw new Error(
          "Nuotraukų keliai neatitinka skelbimo. " +
            "Trynimas sustabdytas."
        );
      }

      if (imagePaths.length > 0) {
        const { error: storageError } =
          await supabase.storage
            .from("listing-images")
            .remove(imagePaths);

        if (storageError) {
          throw new Error(
            "Nepavyko pašalinti nuotraukų: " +
              storageError.message
          );
        }

        photosDeleted = true;
      }

      const {
        data: deletedRows,
        error: deleteError,
      } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId)
        .eq("seller_id", userId)
        .select("id");

      if (deleteError) {
        throw deleteError;
      }

      if (!deletedRows || deletedRows.length === 0) {
        throw new Error(
          "Skelbimo nepavyko ištrinti iš duomenų bazės."
        );
      }

      setListings((previous) =>
        previous.filter(
          (listing) => listing.id !== listingId
        )
      );

      setFavoriteCounts((previous) => {
        const updated = { ...previous };

        delete updated[listingId];

        return updated;
      });

      setListingToDelete(null);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Nežinoma klaida.";

      setError(
        photosDeleted
          ? "Nuotraukos pašalintos, tačiau skelbimo " +
              "ištrinti nepavyko: " +
              message +
              " Skelbimas gali likti be nuotraukų."
          : "Trynimo klaida: " + message
      );

      setListingToDelete(null);
    } finally {
      setDeletingId(null);
    }
  }

  // --------------------------------------------
  // QR ETIKETĖS ATIDARYMAS
  // --------------------------------------------

  function openQrLabel(listing: Listing) {
    if (listing.sale_type === "vehicle") return;
    setListingForQr(listing);
  }

  function closeQrLabel() {
    setListingForQr(null);
  }

  // --------------------------------------------
  // PUSLAPIO VAIZDAS
  // --------------------------------------------

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <div className="mx-auto max-w-6xl">

        {/* ANTRAŠTĖ */}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#24333D]">
              🚗 Mano skelbimai
            </h1>

            <p className="mt-2 text-slate-600">
              Tvarkyk transporto priemonių ir detalių
              skelbimus, sandėlio būsenas bei QR etiketes.
            </p>
          </div>

          <Link
            href="/sell"
            className="rounded-xl bg-[#426A70] px-5 py-3 font-bold text-white hover:bg-[#35575D]"
          >
            + Įdėti naują skelbimą
          </Link>
        </div>

        {/* PARDAVEJO TOP DETALIU STATISTIKA */}
        {!loading && isLoggedIn && <SellerTopPartsStats />}
        {/* KROVIMAS */}

        {loading && (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            Įkeliami tavo skelbimai...
          </div>
        )}

        {/* PRISIJUNGIMAS */}

        {!loading && !isLoggedIn && (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-[#24333D]">
              Prisijunk prie savo paskyros
            </h2>

            <p className="mb-5 text-slate-600">
              Norėdamas matyti savo skelbimus,
              prisijunk.
            </p>

            <Link
              href="/login"
              className="inline-block rounded-xl bg-[#426A70] px-5 py-3 font-bold text-white"
            >
              Prisijungti
            </Link>
          </div>
        )}

        {/* KLAIDOS */}

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-red-100 p-4 text-red-800"
          >
            {error}
          </p>
        )}

        {favoritesWarning && (
          <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            {favoritesWarning}
          </p>
        )}

        {/* TUŠČIAS SĄRAŠAS */}

        {!loading &&
          isLoggedIn &&
          !error &&
          listings.length === 0 && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <h2 className="mb-3 text-2xl font-bold text-[#24333D]">
                Dar neturi savo skelbimų
              </h2>

              <p className="mb-6 text-slate-600">
                Įkelk pirmąją detalę, automobilį
                arba motociklą.
              </p>

              <Link
                href="/sell"
                className="inline-block rounded-xl bg-[#426A70] px-6 py-3 font-bold text-white"
              >
                Įdėti skelbimą
              </Link>
            </div>
          )}

        {/* SKELBIMŲ SĄRAŠAS */}

        {!loading &&
          isLoggedIn &&
          listings.length > 0 && (
            <>
              {/* STATISTIKA */}

              <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[#E3E9E7] bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    📋 Visi skelbimai
                  </p>

                  <p className="mt-2 text-3xl font-black text-[#24333D]">
                    {listings.length}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {partsCount} detalių · {vehiclesCount} transporto priemonių
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E3E9E7] bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    👁 Bendros peržiūros
                  </p>

                  <p className="mt-2 text-3xl font-black text-[#24333D]">
                    {totalViews}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E3E9E7] bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    ♡ Bendros širdelės
                  </p>

                  <p className="mt-2 text-3xl font-black text-[#24333D]">
                    {totalLikes}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E3E9E7] bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    🚗 Transporto priemonės
                  </p>

                  <p className="mt-2 text-3xl font-black text-[#24333D]">
                    {vehiclesCount}
                  </p>
                </div>
              </div>

              {/* BŪSENŲ SUVESTINĖ */}

              <div className="mb-7 rounded-2xl border border-[#E3E9E7] bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-[#24333D]">
                  📊 Skelbimų būsenos
                </h2>

                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <button
                    type="button"
                    onClick={() => changeFilter("all")}
                    aria-pressed={selectedFilter === "all"}
                    className={`rounded-xl border p-3 text-center transition ${
                      selectedFilter === "all"
                        ? "border-[#426A70] bg-[#E7F0EE] ring-2 ring-[#426A70]/20"
                        : "border-[#E3E9E7] bg-[#F5F7F6] hover:bg-[#EDF4F2]"
                    }`}
                  >
                    <p className="text-xs text-slate-600">
                      📋 Visi
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#24333D]">
                      {listings.length}
                    </p>
                  </button>

                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        changeFilter(option.value)
                      }
                      aria-pressed={
                        selectedFilter === option.value
                      }
                      className={`rounded-xl border p-3 text-center transition ${
                        selectedFilter === option.value
                          ? "border-[#426A70] bg-[#E7F0EE] ring-2 ring-[#426A70]/20"
                          : "border-[#E3E9E7] bg-[#F5F7F6] hover:bg-[#EDF4F2]"
                      }`}
                    >
                      <p className="text-xs text-slate-600">
                        {option.label}
                      </p>

                      <p className="mt-2 text-2xl font-black text-[#24333D]">
                        {statusCounts[option.value]}
                      </p>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-slate-500">
                  Paspausk būseną, kad matytum tik jai
                  priklausančius skelbimus.
                </p>
              </div>

              {/* PASIRINKTAS FILTRAS */}

              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#24333D]">
                    {selectedFilterLabel}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Rodoma: {filteredListings.length} iš{" "}
                    {listings.length} skelbimų
                  </p>
                </div>

                {selectedFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => changeFilter("all")}
                    className="rounded-xl border border-[#D9E2E0] bg-white px-4 py-2 text-sm font-bold text-[#426A70] hover:bg-[#EDF4F2]"
                  >
                    Rodyti visus
                  </button>
                )}
              </div>

              {/* FILTRAS BE REZULTATŲ */}

              {filteredListings.length === 0 ? (
                <div className="rounded-2xl border border-[#E3E9E7] bg-white p-10 text-center shadow-sm">
                  <p className="mb-3 text-xl font-bold text-[#24333D]">
                    Šioje būsenoje skelbimų nėra
                  </p>

                  <p className="mb-5 text-slate-600">
                    Pasirink kitą būseną arba
                    peržiūrėk visus skelbimus.
                  </p>

                  <button
                    type="button"
                    onClick={() => changeFilter("all")}
                    className="rounded-xl bg-[#426A70] px-5 py-3 font-bold text-white hover:bg-[#35575D]"
                  >
                    Rodyti visus skelbimus
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredListings.map((listing) => {
                    const firstImage = [
                      ...(listing.listing_images ?? []),
                    ].sort(
                      (a, b) =>
                        (a.sort_order ?? 0) -
                          (b.sort_order ?? 0) ||
                        a.id.localeCompare(b.id)
                    )[0];

                    const likes =
                      favoriteCounts[listing.id] ?? 0;

                    const isVehicle =
                      listing.sale_type === "vehicle";

                    const vehicleName = [
                      listing.manufacturer,
                      listing.model,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <article
                        key={listing.id}
                        className={`flex flex-col overflow-hidden rounded-2xl border border-[#E3E9E7] bg-white shadow-sm ${
                          isVehicle ? "" : "p-5"
                        }`}
                      >
                        {/* NUOTRAUKA */}

                        <Link
                          href={`/listings/${listing.id}`}
                          className={`relative flex items-center justify-center overflow-hidden bg-slate-100 ${
                            isVehicle
                              ? "h-64"
                              : "mb-4 h-56 rounded-xl"
                          }`}
                        >
                          {firstImage ? (
                            <img
                              src={getImageUrl(
                                firstImage.image_path
                              )}
                              alt={listing.title}
                              className={`h-full w-full ${
                                isVehicle
                                  ? "object-cover"
                                  : "object-contain"
                              }`}
                            />
                          ) : (
                            <span className="text-6xl">
                              {listing.category ===
                              "motorcycle"
                                ? "🏍️"
                                : "🚗"}
                            </span>
                          )}

                          {isVehicle && (
                            <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-[#24333D] shadow-sm">
                              {listing.category ===
                              "motorcycle"
                                ? "🏍️ Motociklas"
                                : "🚗 Automobilis"}
                            </span>
                          )}

                          {isVehicle && (
                            <span
                              className={`absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${getStatusColor(
                                listing.status
                              )}`}
                            >
                              {getPublicStatus(
                                listing.status
                              )}
                            </span>
                          )}
                        </Link>

                        <div
                          className={
                            isVehicle
                              ? "flex flex-1 flex-col p-5"
                              : "flex flex-1 flex-col"
                          }
                        >
                          {/* PAVADINIMAS */}

                          <Link
                            href={`/listings/${listing.id}`}
                            className="mb-2 block text-xl font-bold text-[#24333D] hover:text-[#426A70]"
                          >
                            {isVehicle
                              ? vehicleName ||
                                listing.title
                              : listing.title}
                          </Link>

                          {/* TRANSPORTO PRIEMONĖS INFORMACIJA */}

                          {isVehicle && (
                            <>
                              <div className="mb-3 flex flex-wrap gap-2">
                                {listing.year && (
                                  <span className="rounded-lg bg-[#F0F4F3] px-3 py-1.5 text-sm font-semibold text-[#24333D]">
                                    📅 {listing.year} m.
                                  </span>
                                )}

                                <span className="rounded-lg bg-[#F0F4F3] px-3 py-1.5 text-sm font-semibold text-[#24333D]">
                                  {listing.condition ===
                                  "new"
                                    ? "Nauja"
                                    : "Naudota"}
                                </span>

                                {listing.vehicle_generation && (
                                  <span className="rounded-lg bg-[#F0F4F3] px-3 py-1.5 text-sm font-semibold text-[#24333D]">
                                    {
                                      listing.vehicle_generation
                                    }
                                  </span>
                                )}
                              </div>

                              {listing.title !== vehicleName &&
                                vehicleName && (
                                  <p className="mb-3 line-clamp-2 text-sm text-slate-600">
                                    {listing.title}
                                  </p>
                                )}
                            </>
                          )}

                          {/* VIDINIS AMD KODAS TIK DETALĖMS */}

                          {!isVehicle &&
                            listing.internal_code && (
                              <div className="mb-3 rounded-xl border border-[#C9DAD7] bg-[#EDF4F2] px-3 py-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#426A70]">
                                  Vidinis detalės kodas
                                </p>

                                <p className="mt-1 font-mono text-xl font-black tracking-wide text-[#24333D]">
                                  {listing.internal_code}
                                </p>
                              </div>
                            )}

                          {/* KAINA */}

                          <p
                            className={`font-black text-[#426A70] ${
                              isVehicle
                                ? "mb-4 text-3xl"
                                : "mb-3 text-2xl"
                            }`}
                          >
                            {isVehicle
                              ? formatPrice(listing.price)
                              : Number(
                                  listing.price
                                ).toFixed(2)}{" "}
                            €
                          </p>

                          {/* DETALĖS INFORMACIJA */}

                          {!isVehicle && (
                            <p className="mb-3 text-sm text-slate-600">
                              {listing.condition === "new"
                                ? "Nauja"
                                : "Naudota"}
                              {" · "}
                              {[
                                listing.manufacturer,
                                listing.model,
                                listing.vehicle_generation,
                                listing.year,
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          )}

                          {/* SANDĖLIO VIETA TIK DETALĖMS */}

                          {!isVehicle &&
                            listing.warehouse_location && (
                              <p className="mb-3 rounded-lg bg-[#F5F7F6] px-3 py-2 text-sm font-semibold text-[#24333D]">
                                📍 Sandėlio vieta:{" "}
                                {
                                  listing.warehouse_location
                                }
                              </p>
                            )}

                          {/* BŪSENOS KEITIMAS */}

                          <div className="mb-4 rounded-xl border border-[#E3E9E7] bg-[#F8FAF9] p-3">
                            <label
                              htmlFor={`status-${listing.id}`}
                              className="mb-2 block text-sm font-bold text-[#24333D]"
                            >
                              {isVehicle
                                ? "Skelbimo būsena"
                                : "Sandėlio būsena"}
                            </label>

                            <select
                              id={`status-${listing.id}`}
                              value={listing.status}
                              disabled={
                                savingStatusId !== null ||
                                deletingId !== null
                              }
                              onChange={(event) =>
                                void changeListingStatus(
                                  listing,
                                  event.target
                                    .value as ListingStatus
                                )
                              }
                              className="w-full rounded-lg border border-[#D9E2E0] bg-white px-3 py-2 text-sm text-[#24333D] outline-none focus:border-[#426A70] disabled:opacity-50"
                            >
                              {STATUS_OPTIONS.map(
                                (option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {isVehicle &&
                                    option.value ===
                                      "active"
                                      ? "🟢 Aktyvus"
                                      : option.label}
                                  </option>
                                )
                              )}
                            </select>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-slate-500">
                                Pirkėjui:
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusColor(
                                  listing.status
                                )}`}
                              >
                                {getPublicStatus(
                                  listing.status
                                )}
                              </span>
                            </div>

                            {savingStatusId ===
                              listing.id && (
                              <p className="mt-2 text-xs text-slate-500">
                                Išsaugoma...
                              </p>
                            )}

                            {statusMessage[
                              listing.id
                            ] && (
                              <p
                                className={`mt-2 text-xs ${
                                  statusMessage[
                                    listing.id
                                  ].startsWith("Klaida")
                                    ? "text-red-700"
                                    : "text-emerald-700"
                                }`}
                              >
                                {
                                  statusMessage[
                                    listing.id
                                  ]
                                }
                              </p>
                            )}
                          </div>

                          {/* PERŽIŪROS IR ŠIRDELĖS */}

                          <div className="mb-5 flex flex-wrap items-center gap-4 border-t border-[#EDF1EF] pt-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              👁{" "}
                              {listing.view_count ?? 0}{" "}
                              peržiūros
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              ♡ {likes} patinka
                            </span>
                          </div>

                          {/* VEIKSMŲ MYGTUKAI */}

                          <div className="mt-auto space-y-3">
                            <Link
                              href={`/listings/${listing.id}`}
                              className="block rounded-xl border border-[#D9E2E0] px-4 py-3 text-center font-semibold text-[#426A70] hover:bg-[#EDF4F2]"
                            >
                              Peržiūrėti skelbimą
                            </Link>

                            <Link
                              href={`/my-listings/${listing.id}/edit`}
                              className="block rounded-xl bg-[#426A70] px-4 py-3 text-center font-bold text-white hover:bg-[#35575D]"
                            >
                              ✏️ Redaguoti skelbimą
                            </Link>

                            {/* QR TIK DETALĖMS */}

                            {!isVehicle && (
                              <button
                                type="button"
                                disabled={
                                  deletingId !== null ||
                                  savingStatusId !== null
                                }
                                onClick={() =>
                                  openQrLabel(listing)
                                }
                                className="w-full rounded-xl border-2 border-[#426A70] bg-[#EDF4F2] px-4 py-3 font-bold text-[#426A70] transition hover:bg-[#DCECE8] disabled:opacity-50"
                              >
                                🏷️ QR etiketė
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={
                                deletingId !== null ||
                                savingStatusId !== null
                              }
                              onClick={() => {
                                setError("");
                                setListingToDelete(
                                  listing
                                );
                              }}
                              className="w-full rounded-xl border border-red-300 px-4 py-3 font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              🗑️ Ištrinti skelbimą
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

        <Link
          href="/"
          className="mt-10 inline-block font-semibold text-[#426A70]"
        >
          ← Grįžti į pradžią
        </Link>
      </div>

      {/* ----------------------------------------
          QR ETIKETĖS LANGAS
      ----------------------------------------- */}

      {listingForQr &&
        listingForQr.sale_type !== "vehicle" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="qr-dialog-title"
              className="my-auto w-full max-w-xl rounded-2xl bg-[#F5F7F6] p-5 shadow-2xl sm:p-7"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2
                    id="qr-dialog-title"
                    className="text-xl font-black text-[#24333D]"
                  >
                    🏷️ Detalės QR etiketė
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Peržiūrėk ir atsispausdink
                    sandėlio etiketę.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeQrLabel}
                  aria-label="Uždaryti QR etiketę"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xl font-bold text-[#24333D] hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <PartQrLabel
                listingId={listingForQr.id}
                internalCode={
                  listingForQr.internal_code ?? "AMD"
                }
                title={listingForQr.title}
                manufacturer={
                  listingForQr.manufacturer
                }
                model={listingForQr.model}
                vehicleGeneration={
                  listingForQr.vehicle_generation
                }
                year={listingForQr.year}
                oemNumber={listingForQr.oem_number}
                warehouseLocation={
                  listingForQr.warehouse_location
                }
                condition={listingForQr.condition}
              />

              <button
                type="button"
                onClick={closeQrLabel}
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-[#24333D] hover:bg-slate-50"
              >
                Uždaryti
              </button>
            </div>
          </div>
        )}

      {/* ----------------------------------------
          SKELBIMO TRYNIMO PATVIRTINIMAS
      ----------------------------------------- */}

      {listingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2
              id="delete-dialog-title"
              className="mb-3 text-2xl font-black text-[#24333D]"
            >
              Ištrinti skelbimą?
            </h2>

            <p className="mb-3 text-slate-700">
              Ar tikrai nori ištrinti skelbimą:
            </p>

            <p className="mb-4 font-bold text-[#24333D]">
              {listingToDelete.title}
            </p>

            <p className="mb-6 text-sm text-red-700">
              Šis veiksmas negrįžtamas. Bus pašalintos
              skelbimo nuotraukos, mėgstamiausių žymos
              ir susiję pokalbiai.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() =>
                  setListingToDelete(null)
                }
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-800 disabled:opacity-50"
              >
                Atšaukti
              </button>

              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() =>
                  void deleteListing()
                }
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId
                  ? "Trinama..."
                  : "Taip, ištrinti"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// AUTO_MOTO_MY_LISTINGS_SUSPENSE_V1
export default function MyListingsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
          <div className="mx-auto max-w-6xl">
            <p className="text-slate-700">Įkeliami mano skelbimai...</p>
          </div>
        </main>
      }
    >
      <MyListingsContent />
    </Suspense>
  );
}
