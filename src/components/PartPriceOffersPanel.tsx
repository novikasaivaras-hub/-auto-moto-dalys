"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PriceOffer = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offered_price: number;
  currency: string;
  message: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  buyer_notified_read_at: string | null;
};

type Props = {
  listingId: string;
  userId: string;
  buyerId: string;
  isSeller: boolean;
};

function statusLabel(status: string) {
  if (status === "accepted") return "Priimtas";
  if (status === "rejected") return "Atmestas";
  if (status === "pending") return "Laukia atsakymo";
  return status;
}

export default function PartPriceOffersPanel({
  listingId,
  userId,
  buyerId,
  isSeller,
}: Props) {
  const router = useRouter();
  const [offers, setOffers] = useState<PriceOffer[]>([]);
  const [cartWorkingId, setCartWorkingId] = useState("");
  const [cartSuccessId, setCartSuccessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  const loadOffers = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("listing_price_offers")
      .select(
        "id, listing_id, buyer_id, seller_id, offered_price, currency, message, status, created_at, expires_at, buyer_notified_read_at"
      )
      .eq("listing_id", listingId)
      .eq("buyer_id", buyerId)
      .eq(isSeller ? "seller_id" : "buyer_id", userId)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError("Nepavyko įkelti kainos pasiūlymų.");
    } else {
      setOffers((data ?? []) as PriceOffer[]);
      setError("");
    }

    setLoading(false);
  }, [listingId, userId, buyerId, isSeller]);

  useEffect(() => {
    void loadOffers();

    const interval = setInterval(() => {
      void loadOffers();
    }, 3000);

    return () => clearInterval(interval);
  }, [loadOffers]);

  async function respond(offerId: string, action: "accept" | "reject") {
    if (workingId) return;

    setWorkingId(offerId);
    setError("");

    const { error: responseError } = await supabase.rpc(
      "respond_to_part_price_offer",
      {
        p_offer_id: offerId,
        p_action: action,
      }
    );

    if (responseError) {
      setError(responseError.message);
    } else {
      await loadOffers();
    }

    setWorkingId("");
  }

  async function addAcceptedOfferToCart(
    offer: PriceOffer,
    buyNow: boolean
  ) {
    if (cartWorkingId) return;

    setError("");
    setCartSuccessId("");
    setCartWorkingId(offer.id);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || authData.user?.id !== offer.buyer_id) {
        throw new Error("Turite prisijungti kaip šio pasiūlymo pirkėjas.");
      }

      const { error: rpcError } = await supabase.rpc(
        "add_part_to_cart",
        {
          p_listing_id: offer.listing_id,
          p_price_offer_id: offer.id,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setCartSuccessId(offer.id);

      if (buyNow) {
        router.push("/cart");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepavyko įdėti detalės į krepšelį."
      );
    } finally {
      setCartWorkingId("");
    }
  }
  if (!loading && offers.length === 0) return null;

  return (
    <section className="border-b border-[#E3E9E7] bg-[#FBFCFB] px-5 py-5 sm:px-7">
      <h2 className="mb-4 text-lg font-bold text-[#24333D]">
        💶 Kainos pasiūlymai
      </h2>

      {loading && (
        <p className="text-sm text-[#64748B]">Įkeliami pasiūlymai...</p>
      )}

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {offers.map((offer) => (
          <div
            key={offer.id}
            className="rounded-xl border border-[#E3E9E7] bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xl font-bold text-[#24333D]">
                {Number(offer.offered_price).toFixed(2)} {offer.currency}
              </span>
              <span className="rounded-full bg-[#E6EFEE] px-3 py-1 text-xs font-semibold text-[#35565B]">
                {statusLabel(offer.status)}
              </span>
            </div>

            {offer.message && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-[#64748B]">
                {offer.message}
              </p>
            )}

            <p className="mt-2 text-xs text-[#819095]">
              {new Date(offer.created_at).toLocaleString("lt-LT")}
            </p>

            {!isSeller &&
              offer.buyer_id === userId &&
              offer.status === "accepted" &&
              offer.expires_at &&
              new Date(offer.expires_at).getTime() > Date.now() && (
                <div className="mt-4">
                  <p className="mb-3 text-xs font-semibold text-green-700">
                    Sutarta kaina galioja iki{" "}
                    {new Date(offer.expires_at).toLocaleString("lt-LT")}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={Boolean(cartWorkingId)}
                      onClick={() =>
                        void addAcceptedOfferToCart(offer, false)
                      }
                      className="rounded-lg bg-[#426A70] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      🛒 Į krepšelį
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(cartWorkingId)}
                      onClick={() =>
                        void addAcceptedOfferToCart(offer, true)
                      }
                      className="rounded-lg border border-[#426A70] px-4 py-2 text-sm font-semibold text-[#426A70] disabled:opacity-50"
                    >
                      ⚡ Pirkti dabar
                    </button>
                  </div>

                  {cartSuccessId === offer.id && (
                    <Link
                      href="/cart"
                      className="mt-3 inline-block text-sm font-semibold text-[#426A70] underline"
                    >
                      ✓ Įdėta. Peržiūrėti krepšelį
                    </Link>
                  )}
                </div>
              )}
            {isSeller && offer.status === "pending" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={Boolean(workingId)}
                  onClick={() => void respond(offer.id, "accept")}
                  className="rounded-lg bg-[#426A70] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Priimti
                </button>
                <button
                  type="button"
                  disabled={Boolean(workingId)}
                  onClick={() => void respond(offer.id, "reject")}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                >
                  Atmesti
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}