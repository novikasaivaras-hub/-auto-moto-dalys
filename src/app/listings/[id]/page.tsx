
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PartPriceOffer from "@/components/PartPriceOffer";
import AddPartToCartButton from "@/components/AddPartToCartButton";

const VIEW_INTERVAL = 24 * 60 * 60 * 1000;

type ListingImage = {
  id: string;
  image_path: string;
  sort_order: number | null;
};

type Listing = {
  id: string;
  seller_id: string;
  sale_type: "part" | "vehicle";
  title: string;
  description: string | null;
  price: number;
  category: string;
  condition: string;
  manufacturer: string | null;
  model: string | null;
  vehicle_generation: string | null;
  year: number | null;
  oem_number: string | null;
  view_count: number;
  created_at: string;
  listing_images: ListingImage[];
};

type PublicSeller = {
  seller_name: string;
  seller_type: string | null;
};

function formatPrice(price: number) {
  return Number(price).toLocaleString("lt-LT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

type VehicleDescription = {
  introduction: string;
  technical: { label: string; value: string }[];
  equipment: string[];
  damage: string;
};

function parseVehicleDescription(description: string | null): VehicleDescription {
  const result: VehicleDescription = {
    introduction: "",
    technical: [],
    equipment: [],
    damage: "",
  };

  if (!description) return result;

  const sections: Record<string, string[]> = {
    introduction: [],
    technical: [],
    equipment: [],
    damage: [],
  };

  let section = "introduction";

  for (const rawLine of description.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "TECHNINĖ INFORMACIJA") {
      section = "technical";
      continue;
    }
    if (line === "YPATUMAI IR ĮRANGA") {
      section = "equipment";
      continue;
    }
    if (line === "DEFEKTAI IR REMONTAI") {
      section = "damage";
      continue;
    }

    sections[section].push(rawLine);
  }

  result.introduction = sections.introduction.join("\n").trim();
  result.damage = sections.damage.join("\n").trim();

  for (const rawLine of sections.technical) {
    const line = rawLine.trim();
    const separator = line.indexOf(":");

    if (separator > 0) {
      result.technical.push({
        label: line.slice(0, separator).trim(),
        value: line.slice(separator + 1).trim(),
      });
    } else if (line) {
      result.introduction +=
        (result.introduction ? "\n" : "") + line;
    }
  }

  result.equipment = sections.equipment
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^✓\s*/, ""));

  return result;
}
function ListingDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<PublicSeller | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [vehicleVin, setVehicleVin] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  // SAVININKO PERZIURU GRAFIKAS V1
  const [dailyViews, setDailyViews] = useState<
    { view_date: string; view_count: number }[]
  >([]);
  const [viewsPeriod, setViewsPeriod] = useState<7 | 30>(7);
  const [dailyViewsLoading, setDailyViewsLoading] = useState(false);
  const [dailyViewsError, setDailyViewsError] = useState("");
  // SAVININKO PAMĖGIMŲ IR UŽKLAUSŲ STATISTIKA
  const [favoritesCount, setFavoritesCount] = useState<number | null>(null);
  const [inquiriesCount, setInquiriesCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  const viewProcessingRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      setLoading(true);
      setError("");
      setChatError("");
      setListing(null);
      setSeller(null);
      setActiveImage(0);
      setAuthChecked(false);
      setCurrentUserId(null);
      setVehicleVin(null);
      setDailyViews([]);
      setDailyViewsLoading(false);
      setDailyViewsError("");
      setViewsPeriod(7);
      setFavoritesCount(null);
      setInquiriesCount(null);
      setStatsError("");
      setStatsLoading(false);

      const { data, error: queryError } = await supabase
        .from("listings")
        .select(`
          id,
          seller_id,
          sale_type,
          title,
          description,
          price,
          category,
          condition,
          manufacturer,
          model,
          vehicle_generation,
          year,
          oem_number,
          view_count,
          created_at,
          listing_images (
            id,
            image_path,
            sort_order
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Skelbimas nerastas.");
        setLoading(false);
        return;
      }

      // AUTO_MOTO_RECENTLY_VIEWED_V1
      // Paskutiniai 20 atidarytų skelbimų saugomi tik šioje naršyklėje.
      try {
        const recentKey = "auto-moto-recently-viewed-v1";
        const stored = JSON.parse(localStorage.getItem(recentKey) || "[]");
        const previous: string[] = Array.isArray(stored)
          ? stored.filter((item): item is string => typeof item === "string")
          : [];

        const updated = [
          data.id,
          ...previous.filter((item) => item !== data.id),
        ].slice(0, 20);

        localStorage.setItem(recentKey, JSON.stringify(updated));
      } catch {
        // Jei naršyklė blokuoja saugojimą, skelbimo rodymas veikia toliau.
      }
      const loadedListing = data as Listing;
      setListing(loadedListing);

      const { data: authData } = await supabase.auth.getUser();

      if (cancelled) return;

      const userId = authData.user?.id ?? null;
      setCurrentUserId(userId);
      setAuthChecked(true);

      if (userId && userId === loadedListing.seller_id && loadedListing.sale_type === "vehicle") {
        const { data: vinData, error: vinError } = await supabase
          .from("listing_vehicle_vins")
          .select("vin")
          .eq("listing_id", loadedListing.id)
          .maybeSingle();

        if (cancelled) return;

        if (vinError) {
          console.error("VIN nuskaitymo klaida:", vinError);
        } else {
          setVehicleVin(vinData?.vin ?? null);
        }
      }


      // Statistika kraunama tik tikrajam skelbimo savininkui.
      // Dienos statistika prieinama tik skelbimo savininkui.
      if (userId && userId === loadedListing.seller_id) {
        setDailyViewsLoading(true);

        const { data: dailyData, error: dailyError } = await supabase
          .from("listing_daily_views")
          .select("view_date, view_count")
          .eq("listing_id", loadedListing.id)
          .order("view_date", { ascending: true });

        if (cancelled) return;

        if (dailyError) {
          console.error("Dienos statistikos klaida:", dailyError);
          setDailyViewsError("Nepavyko įkelti peržiūrų istorijos.");
        } else {
          setDailyViews(dailyData ?? []);
        }

        setDailyViewsLoading(false);
      }
      if (userId && userId === loadedListing.seller_id) {
        setStatsLoading(true);

        const [favoritesResult, inquiriesResult] = await Promise.all([
          supabase
            .from("favorites")
            .select("listing_id", { count: "exact", head: true })
            .eq("listing_id", loadedListing.id),
          supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("listing_id", loadedListing.id)
            .eq("seller_id", userId),
        ]);

        if (cancelled) return;

        if (favoritesResult.error || inquiriesResult.error) {
          setStatsError(
            "Dalies statistikos nepavyko įkelti. Patikrink prieigos teises."
          );
        }

        if (!favoritesResult.error) {
          setFavoritesCount(favoritesResult.count ?? 0);
        }

        if (!inquiriesResult.error) {
          setInquiriesCount(inquiriesResult.count ?? 0);
        }

        setStatsLoading(false);
      }
      if (userId !== loadedListing.seller_id) {
        void registerView(loadedListing);
      }

      const { data: sellerData, error: sellerError } =
        await supabase.rpc("get_public_seller", {
          p_seller_id: loadedListing.seller_id,
        });

      if (cancelled) return;

      if (sellerError) {
        console.error("Pardavėjo duomenų klaida:", sellerError);
      } else {
        const sellerRow = Array.isArray(sellerData)
          ? sellerData[0]
          : sellerData;

        if (sellerRow) {
          setSeller(sellerRow as PublicSeller);
        }
      }

      setLoading(false);
    }

    async function registerView(currentListing: Listing) {
      const listingId = currentListing.id;
      const storageKey = `listing_view_${listingId}`;

      if (viewProcessingRef.current === listingId) {
        return;
      }

      let lastViewed = 0;

      try {
        lastViewed = Number(
          window.localStorage.getItem(storageKey) ?? "0"
        );
      } catch {
        // Peržiūrą vis tiek bandome užregistruoti.
      }

      const now = Date.now();

      if (
        Number.isFinite(lastViewed) &&
        now - lastViewed < VIEW_INTERVAL
      ) {
        return;
      }

      viewProcessingRef.current = listingId;

      try {
        const { data: newCount, error: viewError } =
          await supabase.rpc("increment_listing_views", {
            p_listing_id: listingId,
          });

        if (viewError) {
          console.error(
            "Peržiūros skaičiavimo klaida:",
            viewError
          );
          return;
        }

        if (!cancelled) {
          setListing((previous) =>
            previous?.id === listingId
              ? {
                  ...previous,
                  view_count:
                    typeof newCount === "number"
                      ? newCount
                      : previous.view_count,
                }
              : previous
          );
        }

        try {
          window.localStorage.setItem(
            storageKey,
            String(now)
          );
        } catch {
          // Peržiūra jau užregistruota.
        }
      } finally {
        viewProcessingRef.current = null;
      }
    }

    if (id) {
      void loadListing();
    } else {
      setError("Nenurodytas skelbimo ID.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  function getImageUrl(path: string) {
    return supabase.storage
      .from("listing-images")
      .getPublicUrl(path).data.publicUrl;
  }

  async function startConversation() {
    if (!listing || startingChat) return;

    setStartingChat(true);
    setChatError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.push(
          `/login?next=${encodeURIComponent(
            `/listings/${listing.id}`
          )}`
        );
        return;
      }

      const userId = authData.user.id;

      if (userId === listing.seller_id) {
        setChatError(
          "Negalite pradėti pokalbio su savimi."
        );
        return;
      }

      const { data: existing, error: lookupError } =
        await supabase
          .from("conversations")
          .select("id")
          .eq("listing_id", listing.id)
          .eq("buyer_id", userId)
          .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }

      if (existing) {
        router.push(`/messages/${existing.id}`);
        return;
      }

      const { data: created, error: insertError } =
        await supabase
          .from("conversations")
          .insert({
            listing_id: listing.id,
            buyer_id: userId,
            seller_id: listing.seller_id,
          })
          .select("id")
          .single();

      if (insertError) {
        if (insertError.code === "23505") {
          const { data: concurrentConversation } =
            await supabase
              .from("conversations")
              .select("id")
              .eq("listing_id", listing.id)
              .eq("buyer_id", userId)
              .maybeSingle();

          if (concurrentConversation) {
            router.push(
              `/messages/${concurrentConversation.id}`
            );
            return;
          }
        }

        throw insertError;
      }

      router.push(`/messages/${created.id}`);
    } catch (err) {
      console.error("Pokalbio kūrimo klaida:", err);
      setChatError(
        "Nepavyko pradėti pokalbio. Bandykite dar kartą."
      );
    } finally {
      setStartingChat(false);
    }
  }

  const images = [...(listing?.listing_images ?? [])].sort(
    (a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      a.id.localeCompare(b.id)
  );

  const currentImage = images[activeImage] ?? images[0];

  // SAVININKO STATISTIKOS SKYDELIS
  const publishedDate = listing?.created_at
    ? new Date(listing.created_at)
    : null;

  const publishedDateValid =
    publishedDate !== null &&
    !Number.isNaN(publishedDate.getTime());

  const daysPublished = publishedDateValid
    ? Math.max(
        1,
        Math.ceil(
          (Date.now() - publishedDate!.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const averageDailyViews =
    daysPublished !== null
      ? ((listing?.view_count ?? 0) / daysPublished).toFixed(1)
      : null;
  // Grafikui sudarome visas kalendorines dienas,
  // iskaitant dienas be perziuru.
  const todayVilnius = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vilnius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [todayYear, todayMonth, todayDay] = todayVilnius
    .split("-")
    .map(Number);

  const dailyViewsMap = new Map(
    dailyViews.map((item) => [
      item.view_date,
      Number(item.view_count) || 0,
    ])
  );

  const chartDays = Array.from({ length: viewsPeriod }, (_, index) => {
    const offset = index - (viewsPeriod - 1);
    const day = new Date(
      Date.UTC(todayYear, todayMonth - 1, todayDay + offset)
    );
    const dateKey = day.toISOString().slice(0, 10);

    return {
      date: dateKey,
      label: `${String(day.getUTCDate()).padStart(2, "0")}.${String(
        day.getUTCMonth() + 1
      ).padStart(2, "0")}`,
      views: dailyViewsMap.get(dateKey) ?? 0,
    };
  });

  const chartTotal = chartDays.reduce(
    (sum, day) => sum + day.views,
    0
  );

  const chartMax = Math.max(1, ...chartDays.map((day) => day.views));
  const isOwner =
    authChecked &&
    currentUserId !== null &&
    listing?.seller_id === currentUserId;

  const isVehicle = listing?.sale_type === "vehicle";
  const vehicleDetails = parseVehicleDescription(listing?.description ?? null);
  const isMotorcycle = listing?.category === "motorcycle";

  const vehicleName = [
    listing?.manufacturer,
    listing?.model,
  ]
    .filter(Boolean)
    .join(" ");

  const sellerTypeLabel =
    seller?.seller_type === "business"
      ? "Įmonė"
      : seller?.seller_type
        ? "Privatus asmuo"
        : "Nenurodyta";

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/listings"
          className="mb-6 inline-block font-semibold text-[#426A70] hover:underline"
        >
          ← Grįžti į skelbimus
        </Link>

        {loading && (
          <p className="text-slate-700">
            Įkeliamas skelbimas...
          </p>
        )}

        {error && (
          <p className="rounded-xl bg-red-100 p-5 text-red-800">
            {error}
          </p>
        )}

        {listing && !loading && (
          <>
            {/* TRANSPORTO PRIEMONĖS ANTRAŠTĖ */}

            {isVehicle && (
              <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#EDF4F2] px-3 py-1 text-xs font-bold text-[#426A70]">
                    {isMotorcycle
                      ? "🏍️ Motociklas"
                      : "🚗 Automobilis"}
                  </span>

                  {listing.year && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {listing.year} m.
                    </span>
                  )}

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {listing.condition === "new"
                      ? "Nauja"
                      : "Naudota"}
                  </span>
                </div>

                <h1 className="text-3xl font-black text-[#24333D] sm:text-4xl">
                  {vehicleName || listing.title}
                </h1>

                {vehicleName &&
                  listing.title !== vehicleName && (
                    <p className="mt-2 text-slate-600">
                      {listing.title}
                    </p>
                  )}

                <p className="mt-4 text-3xl font-black text-[#426A70] sm:text-4xl">
                  {formatPrice(listing.price)} €

                </p>
              </div>
            )}

            <div className="grid gap-8 lg:grid-cols-3">
              <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">

                {/* DETALĖS PAVADINIMAS */}

                {!isVehicle && (
                  <h1 className="mb-6 text-3xl font-black text-[#24333D]">
                    {listing.title}
                  </h1>
                )}

                {/* NUOTRAUKŲ GALERIJA */}

                {images.length > 0 ? (
                  <>
                    <div
                      className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-slate-100 ${
                        isVehicle
                          ? "h-72 sm:h-[480px]"
                          : "h-72 sm:h-96" // AUTO_MOTO_MOBILE_GALLERY_V1
                      }`}
                    >
                      <img
                        src={getImageUrl(
                          currentImage.image_path
                        )}
                        alt={listing.title}
                        className={`h-full w-full ${
                          isVehicle
                            ? "object-cover"
                            : "object-contain"
                        }`}
                      />

                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveImage((index) =>
                                index === 0
                                  ? images.length - 1
                                  : index - 1
                              )
                            }
                            className="absolute left-3 rounded-full bg-white/90 px-4 py-2 text-2xl shadow"
                            aria-label="Ankstesnė nuotrauka"
                          >
                            ‹
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setActiveImage((index) =>
                                index === images.length - 1
                                  ? 0
                                  : index + 1
                              )
                            }
                            className="absolute right-3 rounded-full bg-white/90 px-4 py-2 text-2xl shadow"
                            aria-label="Kita nuotrauka"
                          >
                            ›
                          </button>

                          <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-sm text-white">
                            {activeImage + 1} / {images.length}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-4 flex gap-3 overflow-x-auto">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() =>
                            setActiveImage(index)
                          }
                          aria-label={`Rodyti ${
                            index + 1
                          } nuotrauką`}
                          className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                            activeImage === index
                              ? "border-[#426A70]"
                              : "border-transparent"
                          }`}
                        >
                          <img
                            src={getImageUrl(
                              image.image_path
                            )}
                            alt={`Nuotrauka ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-80 items-center justify-center rounded-xl bg-slate-100 text-7xl">
                    {isMotorcycle ? "🏍️" : "🚗"}
                  </div>
                )}

                {/* TRANSPORTO PRIEMONĖS DUOMENYS */}

                {isVehicle ? (
                  <>
                    <h2 className="mb-4 mt-8 text-2xl font-black text-[#24333D]">
                      Transporto priemonės informacija
                    </h2>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-[#F5F7F6] p-4">
                        <p className="text-xs text-slate-500">
                          Markė
                        </p>
                        <p className="mt-1 font-bold text-[#24333D]">
                          {listing.manufacturer ||
                            "Nenurodyta"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F5F7F6] p-4">
                        <p className="text-xs text-slate-500">
                          Modelis
                        </p>
                        <p className="mt-1 font-bold text-[#24333D]">
                          {listing.model || "Nenurodyta"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F5F7F6] p-4">
                        <p className="text-xs text-slate-500">
                          Pagaminimo metai
                        </p>
                        <p className="mt-1 font-bold text-[#24333D]">
                          {listing.year
                            ? `${listing.year} m.`
                            : "Nenurodyta"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F5F7F6] p-4">
                        <p className="text-xs text-slate-500">
                          Būklė
                        </p>
                        <p className="mt-1 font-bold text-[#24333D]">
                          {listing.condition === "new"
                            ? "Nauja"
                            : "Naudota"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#F5F7F6] p-4">
                        <p className="text-xs text-slate-500">
                          Transporto priemonės tipas
                        </p>
                        <p className="mt-1 font-bold text-[#24333D]">
                          {isMotorcycle
                            ? "Motociklas"
                            : "Automobilis"}
                        </p>
                      </div>

                      {listing.vehicle_generation && (
                        <div className="rounded-xl bg-[#F5F7F6] p-4">
                          <p className="text-xs text-slate-500">
                            Karta / modifikacija
                          </p>
                          <p className="mt-1 font-bold text-[#24333D]">
                            {listing.vehicle_generation}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-200 bg-[#F5F7F6] p-4">
                      <p className="text-xs font-semibold text-slate-500">
                        VIN kodas
                      </p>

                      {/* AUTO_MOTO_VIN_OWNER_UI_V1 */}
                      {!authChecked ? (
                        <p className="mt-2 text-sm text-slate-600">
                          Tikrinama paskyra...
                        </p>
                      ) : currentUserId === listing.seller_id ? (
                        <p className="mt-2 font-bold tracking-wider text-[#24333D]">
                          {vehicleVin || "VIN nenurodytas"}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">
                          Pilnas VIN kodas matomas tik skelbimo savininkui.
                        </p>
                      )}
                    </div>
                    {vehicleDetails.technical.length > 0 && (
                      <section className="mt-8">
                        <h2 className="mb-4 text-2xl font-black text-[#24333D]">
                          Techninė informacija
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {vehicleDetails.technical.map((item, index) => (
                            <div
                              key={`${item.label}-${index}`}
                              className="rounded-xl bg-[#F5F7F6] p-4"
                            >
                              <p className="text-xs text-slate-500">
                                {item.label}
                              </p>
                              <p className="mt-1 font-bold text-[#24333D]">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {vehicleDetails.equipment.length > 0 && (
                      <section className="mt-8">
                        <h2 className="mb-4 text-2xl font-black text-[#24333D]">
                          Ypatumai ir įranga
                        </h2>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {vehicleDetails.equipment.map((item, index) => (
                            <div
                              key={`${item}-${index}`}
                              className="flex items-start gap-2 rounded-xl bg-[#EDF4F2] p-3 text-sm text-[#24333D]"
                            >
                              <span className="font-bold text-[#426A70]">✓</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {vehicleDetails.damage && (
                      <section className="mt-8">
                        <h2 className="mb-3 text-2xl font-black text-[#24333D]">
                          Defektai ir remontai
                        </h2>
                        <p className="whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 p-4 leading-7 text-slate-700">
                          {vehicleDetails.damage}
                        </p>
                      </section>
                    )}

                    <section className="mt-8">
                      <h2 className="mb-3 text-2xl font-black text-[#24333D]">
                        Aprašymas
                      </h2>
                      <p className="whitespace-pre-wrap leading-7 text-slate-700">
                        {vehicleDetails.introduction ||
                          "Pardavėjas papildomo aprašymo nepateikė."}
                      </p>
                    </section>
                  </>
                ) : (
                  <>
                    {/* DETALĖS INFORMACIJA */}

                    <h2 className="mb-4 mt-8 text-xl font-bold text-[#24333D]">
                      Detalės informacija
                    </h2>

                    <div className="grid gap-3 text-slate-700 sm:grid-cols-2">
                      <p>
                        <strong>Markė:</strong>{" "}
                        {listing.manufacturer ||
                          "Nenurodyta"}
                      </p>

                      <p>
                        <strong>Modelis:</strong>{" "}
                        {listing.model || "Nenurodyta"}
                      </p>

                      <p>
                        <strong>Metai:</strong>{" "}
                        {listing.year || "Nenurodyta"}
                      </p>

                      <p>
                        <strong>Būklė:</strong>{" "}
                        {listing.condition === "new"
                          ? "Nauja"
                          : "Naudota"}
                      </p>

                      <p>
                        <strong>OEM kodas:</strong>{" "}
                        {listing.oem_number ||
                          "Nenurodyta"}
                      </p>

                      <p>
                        <strong>Tipas:</strong>{" "}
                        {isMotorcycle
                          ? "Motociklo dalis"
                          : "Automobilio dalis"}
                      </p>
                    </div>

                    <h2 className="mb-3 mt-8 text-xl font-bold text-[#24333D]">
                      Aprašymas
                    </h2>

                    <p className="whitespace-pre-wrap text-slate-700">
                      {listing.description ||
                        "Aprašymas nepateiktas."}
                    </p>
                  </>
                )}
              </section>

              {/* PARDAVĖJO KORTELĖ */}

              <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-500">
                  {isVehicle
                    ? "Transporto priemonės kaina"
                    : "Detalės kaina"}
                </p>

                <p className="mt-2 text-4xl font-black text-[#426A70]">
                  {isVehicle
                    ? formatPrice(listing.price)
                    : Number(listing.price).toFixed(2)}{" "}
                  €
                </p>

                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <span aria-hidden="true">👁</span>
                  <span>
                    {listing.view_count ?? 0} peržiūrų
                  </span>
                </div>

                {isOwner ? (
                  /* SAVININKO STATISTIKOS SKYDELIS */
                  <div className="mt-6 space-y-4 rounded-xl bg-[#EDF4F2] p-4">
                    <div>
                      <h2 className="text-lg font-black text-[#24333D]">
                        ✓ Jūs esate šio skelbimo savininkas
                      </h2>
                      <p className="mt-1 text-xs text-slate-600">
                        Šį skydelį matote tik jūs.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          ❤️ Pamėgimai
                        </p>
                        <p className="mt-1 text-2xl font-black text-[#24333D]">
                          {statsLoading
                            ? "..."
                            : favoritesCount ?? "—"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          💬 Užklausos
                        </p>
                        <p className="mt-1 text-2xl font-black text-[#24333D]">
                          {statsLoading
                            ? "..."
                            : inquiriesCount ?? "—"}
                        </p>
                      </div>
                    </div>

                    {statsError && (
                      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                        {statsError}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          👁 Peržiūros
                        </p>
                        <p className="mt-1 text-2xl font-black text-[#24333D]">
                          {listing.view_count ?? 0}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-slate-500">
                          📅 Paskelbta
                        </p>
                        <p className="mt-2 text-sm font-bold text-[#24333D]">
                          {publishedDateValid
                            ? publishedDate!.toLocaleDateString("lt-LT")
                            : "Nenurodyta"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAdvancedStats((value) => !value)}
                      aria-expanded={showAdvancedStats}
                      className="w-full rounded-xl border border-[#426A70] bg-white px-4 py-3 text-left font-bold text-[#426A70] hover:bg-[#F5F7F6]"
                    >
                      📊 Išplėstinė statistika
                      <span className="float-right">
                        {showAdvancedStats ? "−" : "+"}
                      </span>
                    </button>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold text-[#24333D]">
                          📈 Peržiūrų grafikas
                        </h3>

                        <div className="flex gap-2">
                          {([7, 30] as const).map((period) => (
                            <button
                              key={period}
                              type="button"
                              onClick={() => setViewsPeriod(period)}
                              className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                viewsPeriod === period
                                  ? "bg-[#426A70] text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {period} d.
                            </button>
                          ))}
                        </div>
                      </div>

                      {dailyViewsLoading ? (
                        <p className="mt-4 text-sm text-slate-500">
                          Kraunama statistika...
                        </p>
                      ) : dailyViewsError ? (
                        <p className="mt-4 text-sm text-red-700">
                          {dailyViewsError}
                        </p>
                      ) : (
                        <>
                          <p className="mt-4 text-sm text-slate-600">
                            Per paskutines {viewsPeriod} d.:
                            <strong className="ml-2 text-[#24333D]">
                              {chartTotal} peržiūrų
                            </strong>
                          </p>

                          <div
                            className="mt-5 flex h-40 items-end gap-1 border-b border-slate-200 pb-1"
                            role="img"
                            aria-label={`Peržiūrų grafikas per ${viewsPeriod} dienų`}
                          >
                            {chartDays.map((day) => (
                              <div
                                key={day.date}
                                className="group relative flex h-full min-w-0 flex-1 items-end"
                                title={`${day.date}: ${day.views} peržiūrų`}
                              >
                                <div
                                  className="w-full rounded-t bg-[#426A70] transition-colors group-hover:bg-[#294D53]"
                                  style={{
                                    height: `${
                                      day.views === 0
                                        ? 0
                                        : Math.max(
                                            3,
                                            (day.views / chartMax) * 100
                                          )
                                    }%`,
                                  }}
                                />
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 flex justify-between text-xs text-slate-500">
                            <span>{chartDays[0]?.label}</span>
                            <span>{chartDays[chartDays.length - 1]?.label}</span>
                          </div>

                          <p className="mt-3 text-xs text-slate-500">
                            Užvesk pelę ant stulpelio, kad matytum
                            konkrečios dienos peržiūras.
                          </p>
                        </>
                      )}
                    </div>
                    {showAdvancedStats && (
                      <div className="space-y-3 rounded-xl bg-white p-4 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Pamėgimų skaičius
                          </span>
                          <strong>{favoritesCount ?? "Nėra duomenų"}</strong>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Pirkėjų užklausos
                          </span>
                          <strong>{inquiriesCount ?? "Nėra duomenų"}</strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Skelbimas aktyvus
                          </span>
                          <strong>
                            {daysPublished !== null
                              ? `${daysPublished} d.`
                              : "Nėra duomenų"}
                          </strong>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Pamėgimų skaičius
                          </span>
                          <strong>{favoritesCount ?? "Nėra duomenų"}</strong>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Pirkėjų užklausos
                          </span>
                          <strong>{inquiriesCount ?? "Nėra duomenų"}</strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Vid. peržiūrų per dieną
                          </span>
                          <strong>
                            {averageDailyViews ?? "Nėra duomenų"}
                          </strong>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Pamėgimų skaičius
                          </span>
                          <strong>{favoritesCount ?? "Nėra duomenų"}</strong>
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Pirkėjų užklausos
                          </span>
                          <strong>{inquiriesCount ?? "Nėra duomenų"}</strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-600">
                            Nuotraukų skaičius
                          </span>
                          <strong>{images.length}</strong>
                        </div>

                        <p className="border-t pt-3 text-xs text-slate-500">
                          Dienos vidurkis apskaičiuotas iš bendro
                          peržiūrų skaičiaus. Peržiūrų istorijos
                          ir 7 / 30 dienų grafikų dar nekaupiame.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl bg-slate-100 p-4">
                    <h2 className="text-lg font-bold text-[#24333D]">
                      Pardavėjas
                    </h2>

                    {seller ? (
                      <>
                        <p className="mt-3 font-semibold text-[#24333D]">
                          {seller.seller_name}
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {sellerTypeLabel}
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">
                        Pardavėjo informacija nepasiekiama.
                      </p>
                    )}
                  </div>
                )}

                {!authChecked ? (
                  <p className="mt-6 text-center text-sm text-slate-500">
                    Tikrinama paskyra...
                  </p>
                ) : isOwner ? (
                  <Link
                    href={`/my-listings/${listing.id}/edit`}
                    className="mt-6 block w-full rounded-xl bg-[#426A70] px-5 py-4 text-center font-bold text-white transition hover:bg-[#35565B]"
                  >
                    ✏️ Redaguoti skelbimą
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={startConversation}
                    disabled={startingChat}
                    className="mt-6 w-full rounded-xl bg-[#426A70] px-5 py-4 font-bold text-white transition hover:bg-[#35565B] disabled:opacity-50"
                  >
                    {startingChat
                      ? "Atidaromas pokalbis..."
                      : "💬 Rašyti pardavėjui"}
                  </button>
                )}

                {!isVehicle && (
                  <AddPartToCartButton
                    listingId={listing.id}
                    sellerId={listing.seller_id}
                    currentUserId={currentUserId}
                    authChecked={authChecked}
                  />
                )}
                {!isVehicle && (
                  <PartPriceOffer
                    listingId={listing.id}
                    sellerId={listing.seller_id}
                    currentUserId={currentUserId}
                    authChecked={authChecked}
                    price={listing.price}
                  />
                )}
                {chatError && (
                  <p className="mt-3 rounded-xl bg-red-100 p-3 text-sm text-red-800">
                    {chatError}
                  </p>
                )}

                <div className="mt-6 rounded-xl bg-[#EDF4F2] p-4 text-sm text-slate-700">
                  Saugaus pirkimo ir pristatymo funkcijas
                  prijungsime vėliau.
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function ListingDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
          <p className="mx-auto max-w-6xl text-slate-700">
            Įkeliamas skelbimas...
          </p>
        </main>
      }
    >
      <ListingDetailsContent />
    </Suspense>
  );
}
