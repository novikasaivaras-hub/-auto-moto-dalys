"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  listingId: string;
  sellerId: string;
  currentUserId: string | null;
  authChecked: boolean;
};

export default function AddPartToCartButton({
  listingId,
  sellerId,
  currentUserId,
  authChecked,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  if (!authChecked || currentUserId === sellerId) {
    return null;
  }

  async function addToCart(buyNow: boolean) {
    if (saving) return;

    setError("");
    setSaving(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setError("Norėdami įdėti detalę į krepšelį, prisijunkite.");
        return;
      }

      const { error: rpcError } = await supabase.rpc(
        "add_part_to_cart",
        {
          p_listing_id: listingId,
          p_price_offer_id: null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setAdded(true);

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
      setSaving(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void addToCart(false)}
          disabled={saving}
          className="w-full rounded-xl bg-[#426A70] px-4 py-3 font-bold text-white transition hover:bg-[#35565B] disabled:opacity-60"
        >
          {saving
            ? "Dedama į krepšelį..."
            : added
              ? "✓ Įdėta į krepšelį"
              : "🛒 Į krepšelį"}
        </button>

        <button
          type="button"
          onClick={() => void addToCart(true)}
          disabled={saving}
          className="w-full rounded-xl bg-[#D97706] px-4 py-3 font-bold text-white transition hover:bg-[#B45309] disabled:opacity-60"
        >
          {saving ? "Palaukite..." : "⚡ Pirkti dabar"}
        </button>
      </div>

      {added && (
        <Link
          href="/cart"
          className="mt-3 block text-center text-sm font-semibold text-[#426A70] underline"
        >
          Peržiūrėti krepšelį
        </Link>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}