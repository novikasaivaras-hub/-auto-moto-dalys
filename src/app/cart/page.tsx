"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CartItem = {
  id: string;
  listing_id: string;
  price_offer_id: string | null;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  status: string;
  sale_type?: string;
};

type Offer = {
  id: string;
  offered_price: number;
  status: string;
  expires_at: string | null;
};

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [offers, setOffers] = useState<Record<string, Offer>>({});
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");
  const [favoriteParts, setFavoriteParts] = useState<Listing[]>([]);
  const [addingFavoriteId, setAddingFavoriteId] = useState("");
  const [removingFavoriteId, setRemovingFavoriteId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCart() {
      const { data: authData } = await supabase.auth.getUser();

      if (!active) return;

      if (!authData.user) {
        router.replace("/login");
        return;
      }

      const { data, error: cartError } = await supabase
        .from("cart_items")
        .select("id, listing_id, price_offer_id")
        .eq("buyer_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (cartError) {
        setError("Nepavyko įkelti krepšelio.");
        setLoading(false);
        return;
      }

      const cartItems = (data ?? []) as CartItem[];
      setItems(cartItems);

      const listingIds = [...new Set(cartItems.map((item) => item.listing_id))];
      const offerIds = [
        ...new Set(
          cartItems
            .map((item) => item.price_offer_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      if (listingIds.length > 0) {
        const result = await supabase
          .from("listings")
          .select("id, title, price, status")
          .in("id", listingIds);

        if (result.error) {
          setError("Nepavyko įkelti detalių informacijos.");
        } else if (active) {
          const map: Record<string, Listing> = {};
          for (const listing of (result.data ?? []) as Listing[]) {
            map[listing.id] = listing;
          }
          setListings(map);
        }
      }

      if (offerIds.length > 0) {
        const result = await supabase
          .from("listing_price_offers")
          .select("id, offered_price, status, expires_at")
          .in("id", offerIds);

        if (result.error) {
          setError("Nepavyko įkelti kainos pasiūlymų.");
        } else if (active) {
          const map: Record<string, Offer> = {};
          for (const offer of (result.data ?? []) as Offer[]) {
            map[offer.id] = offer;
          }
          setOffers(map);
        }
      }

      const { data: favoritesData, error: favoritesError } =
        await supabase
          .from("favorites")
          .select("listing_id")
          .eq("user_id", authData.user.id);

      if (!active) return;

      if (favoritesError) {
        setError("Nepavyko įkelti pamėgtų detalių.");
      } else {
        const favoriteIds = (favoritesData ?? [])
          .map((favorite) => favorite.listing_id as string)
          .filter((id) => !listingIds.includes(id));

        if (favoriteIds.length > 0) {
          const { data: favoriteListings, error: listingError } =
            await supabase
              .from("listings")
              .select("id, title, price, status, sale_type")
              .in("id", favoriteIds)
              .eq("sale_type", "part")
              .eq("status", "active");

          if (!active) return;

          if (listingError) {
            setError("Nepavyko įkelti pamėgtų detalių.");
          } else {
            setFavoriteParts((favoriteListings ?? []) as Listing[]);
          }
        } else {
          setFavoriteParts([]);
        }
      }
      if (active) setLoading(false);
    }

    void loadCart();

    return () => {
      active = false;
    };
  }, [router]);

  async function removeCartItem(cartItemId: string) {
    if (removingId) return;

    setRemovingId(cartItemId);
    setError("");

    try {
      const { data, error: removeError } = await supabase.rpc(
        "remove_part_from_cart",
        { p_cart_item_id: cartItemId }
      );

      if (removeError) {
        throw removeError;
      }

      if (data !== true) {
        throw new Error("Prekė nerasta jūsų krepšelyje.");
      }

      setItems((current) =>
        current.filter((item) => item.id !== cartItemId)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepavyko pašalinti prekės."
      );
    } finally {
      setRemovingId("");
    }
  }
  async function removeFavoriteFromCart(listingId: string) {
    if (removingFavoriteId) return;

    setRemovingFavoriteId(listingId);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Prisijunkite prie savo paskyros.");
      }

      const { error: deleteError } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", authData.user.id)
        .eq("listing_id", listingId);

      if (deleteError) throw deleteError;

      setFavoriteParts((previous) =>
        previous.filter((part) => part.id !== listingId)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepavyko pašalinti iš mėgstamų."
      );
    } finally {
      setRemovingFavoriteId("");
    }
  }
  async function addFavoriteToCart(listingId: string) {
    if (addingFavoriteId) return;

    setAddingFavoriteId(listingId);
    setError("");

    try {
      const { error: addError } = await supabase.rpc(
        "add_part_to_cart",
        {
          p_listing_id: listingId,
          p_price_offer_id: null,
        }
      );

      if (addError) throw addError;

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        throw new Error("Prisijunkite prie savo paskyros.");
      }

      const { data: cartData, error: cartError } = await supabase
        .from("cart_items")
        .select("id, listing_id, price_offer_id")
        .eq("buyer_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (cartError) throw cartError;

      const updatedItems = (cartData ?? []) as CartItem[];
      setItems(updatedItems);

      const selectedPart = favoriteParts.find(
        (part) => part.id === listingId
      );

      if (selectedPart) {
        setListings((previous) => ({
          ...previous,
          [listingId]: selectedPart,
        }));
      }

      setFavoriteParts((previous) =>
        previous.filter((part) => part.id !== listingId)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepavyko įdėti detalės į krepšelį."
      );
    } finally {
      setAddingFavoriteId("");
    }
  }
  // AUTO_MOTO_CART_TIME_V1
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-[#426A70]">
          ← AUTO MOTO DALYS
        </Link>

        <h1 className="mt-6 text-3xl font-black text-[#24333D]">
          Mano krepšelis
        </h1>

        {loading && <p className="mt-6">Įkeliamas krepšelis...</p>}

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {!loading && items.length === 0 && (
          <div className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
            <p>Jūsų krepšelis tuščias.</p>
            <Link href="/" className="mt-4 inline-block font-semibold text-[#426A70]">
              Ieškoti detalių →
            </Link>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {items.map((item) => {
            const listing = listings[item.listing_id];
            const offer = item.price_offer_id
              ? offers[item.price_offer_id]
              : null;

            const validOffer =
              offer?.status === "accepted" &&
              Boolean(offer.expires_at) &&
              now > 0 && new Date(offer.expires_at!).getTime() > now;

            const price = validOffer
              ? Number(offer!.offered_price)
              : Number(listing?.price ?? 0);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[#E3E9E7] bg-white p-5 shadow-sm"
              >
                <Link
                  href={`/listings/${item.listing_id}`}
                  className="text-lg font-bold text-[#24333D] hover:underline"
                >
                  {listing?.title ?? "Skelbimas"}
                </Link>

                <p className="mt-3 text-2xl font-black text-[#426A70]">
                  {price.toFixed(2)} €
                </p>

                {validOffer && (
                  <p className="mt-2 text-sm text-green-700">
                    Sutarta kaina galioja iki{" "}
                    {new Date(offer!.expires_at!).toLocaleString("lt-LT")}
                  </p>
                )}

                {offer && !validOffer && (
                  <p className="mt-2 text-sm text-amber-700">
                    Sutarta kaina nebegalioja. Rodoma skelbimo kaina.
                  </p>
                )}

                <button
                  type="button"
                  disabled={Boolean(removingId)}
                  onClick={() => void removeCartItem(item.id)}
                  className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {removingId === item.id
                    ? "Šalinama..."
                    : "🗑 Pašalinti"}
                </button>
                {listing?.status !== "active" && (
                  <p className="mt-2 text-sm text-red-700">
                    Ši detalė šiuo metu neparduodama.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!loading && favoriteParts.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl font-black text-[#24333D]">
              ❤️ Pamėgtos detalės
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Pridėkite pamėgtas detales tiesiai į krepšelį.
            </p>

            <div className="mt-5 space-y-3">
              {favoriteParts.map((part) => (
                <div
                  key={part.id}
                  className="rounded-2xl border border-[#E3E9E7] bg-white p-5 shadow-sm"
                >
                  <Link
                    href={`/listings/${part.id}`}
                    className="font-bold text-[#24333D] hover:underline"
                  >
                    {part.title}
                  </Link>

                  <p className="mt-2 text-xl font-black text-[#426A70]">
                    {Number(part.price).toFixed(2)} €
                  </p>

                  <button
                    type="button"
                    disabled={Boolean(addingFavoriteId)}
                    onClick={() => void addFavoriteToCart(part.id)}
                    className="mt-3 rounded-xl bg-[#426A70] px-4 py-2 font-bold text-white hover:bg-[#35565B] disabled:opacity-60"
                  >
                    {addingFavoriteId === part.id
                      ? "Dedama..."
                      : "🛒 Į krepšelį"}
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(removingFavoriteId)}
                    onClick={() => void removeFavoriteFromCart(part.id)}
                    className="mt-3 ml-3 rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {removingFavoriteId === part.id
                      ? "Šalinama..."
                      : "♥ Pašalinti iš mėgstamų"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        {!loading && items.length > 0 && (
          <p className="mt-6 text-sm text-[#64748B]">
            Užsakymo įforminimą ir mokėjimus prijungsime kitame etape.
            Galutinė kaina bus patikrinta serveryje.
          </p>
        )}
      </div>
    </main>
  );
}