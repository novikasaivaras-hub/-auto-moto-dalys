
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ListingImage = {
  id: string;
  image_path: string;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  created_at: string;
  listing_images: ListingImage[];
};

export default function FavoritesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !authData.user) {
        setUserId("");
        setLoading(false);
        return;
      }

      const currentUserId = authData.user.id;
      setUserId(currentUserId);

      const { data: favoritesData, error: favoritesError } =
        await supabase
          .from("favorites")
          .select("listing_id")
          .eq("user_id", currentUserId);

      if (cancelled) return;

      if (favoritesError) {
        setError(
          "Nepavyko įkelti mėgstamų skelbimų: " +
            favoritesError.message
        );
        setLoading(false);
        return;
      }

      const listingIds = (favoritesData ?? []).map(
        (favorite) => favorite.listing_id as string
      );

      if (listingIds.length === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const { data: listingsData, error: listingsError } =
        await supabase
          .from("listings")
          .select(`
            id,
            title,
            price,
            category,
            condition,
            manufacturer,
            model,
            year,
            created_at,
            listing_images (
              id,
              image_path
            )
          `)
          .in("id", listingIds)
          .order("created_at", { ascending: false });

      if (cancelled) return;

      if (listingsError) {
        setError(
          "Nepavyko įkelti skelbimų: " +
            listingsError.message
        );
      } else {
        setListings((listingsData ?? []) as Listing[]);
      }

      setLoading(false);
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, []);

  async function removeFavorite(listingId: string) {
    if (!userId || removingId) return;

    setRemovingId(listingId);
    setError("");

    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);

    if (deleteError) {
      setError(
        "Nepavyko pašalinti skelbimo: " + deleteError.message
      );
    } else {
      setListings((previous) =>
        previous.filter((listing) => listing.id !== listingId)
      );
    }

    setRemovingId("");
  }

  function getImageUrl(path: string) {
    return supabase.storage
      .from("listing-images")
      .getPublicUrl(path).data.publicUrl;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              ❤️ Mano mėgstami skelbimai
            </h1>

            <p className="mt-2 text-slate-600">
              Čia rasi visas išsaugotas automobilių ir
              motociklų dalis.
            </p>
          </div>

          <Link
            href="/listings"
            className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-600"
          >
            Visi skelbimai
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-slate-600">
              Įkeliami mėgstami skelbimai...
            </p>
          </div>
        )}

        {!loading && !userId && (
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-3 text-xl font-bold">
              Prisijunk prie savo paskyros
            </h2>

            <p className="mb-5 text-slate-600">
              Norėdamas matyti išsaugotus skelbimus,
              turi prisijungti.
            </p>

            <Link
              href="/login"
              className="inline-block rounded-xl bg-orange-500 px-5 py-3 font-bold text-white"
            >
              Prisijungti
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl bg-red-100 p-4 text-red-800">
            {error}
          </div>
        )}

        {!loading &&
          userId &&
          !error &&
          listings.length === 0 && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="mb-4 text-5xl">♡</div>

              <h2 className="mb-3 text-2xl font-bold text-slate-900">
                Dar neturi mėgstamų skelbimų
              </h2>

              <p className="mb-6 text-slate-600">
                Atidaryk skelbimus ir paspausk širdelę
                prie patikusios dalies.
              </p>

              <Link
                href="/listings"
                className="inline-block rounded-xl bg-orange-500 px-6 py-3 font-bold text-white"
              >
                Ieškoti dalių
              </Link>
            </div>
          )}

        {!loading && userId && listings.length > 0 && (
          <>
            <p className="mb-5 text-slate-600">
              Išsaugota skelbimų:{" "}
              <strong>{listings.length}</strong>
            </p>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => {
                const firstImage =
                  listing.listing_images?.[0];

                return (
                  <article
                    key={listing.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <Link
                      href={`/listings/${listing.id}`}
                      className="mb-4 flex h-56 items-center justify-center overflow-hidden rounded-xl bg-slate-100"
                    >
                      {firstImage ? (
                        <img
                          src={getImageUrl(
                            firstImage.image_path
                          )}
                          alt={listing.title}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-6xl">
                          {listing.category === "motorcycle"
                            ? "🏍️"
                            : "🚗"}
                        </span>
                      )}
                    </Link>

                    <Link
                      href={`/listings/${listing.id}`}
                      className="mb-2 block text-xl font-bold text-slate-900 hover:text-orange-600"
                    >
                      {listing.title}
                    </Link>

                    <p className="mb-3 text-2xl font-black text-orange-600">
                      {Number(listing.price).toFixed(2)} €
                    </p>

                    <p className="mb-5 text-sm text-slate-600">
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

                    <button
                      type="button"
                      onClick={() =>
                        void removeFavorite(listing.id)
                      }
                      disabled={removingId === listing.id}
                      className="w-full rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {removingId === listing.id
                        ? "Šalinama..."
                        : "♥ Pašalinti iš mėgstamų"}
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}

        <Link
          href="/"
          className="mt-10 inline-block font-semibold text-orange-600"
        >
          ← Grįžti į pradžią
        </Link>
      </div>
    </main>
  );
}
