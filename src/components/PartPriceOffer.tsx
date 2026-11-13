"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  listingId: string;
  sellerId: string;
  currentUserId: string | null;
  authChecked: boolean;
  price: number;
};

export default function PartPriceOffer({
  listingId,
  sellerId,
  currentUserId,
  authChecked,
  price,
}: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!authChecked || currentUserId === sellerId) return null;

  async function submitOffer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (sending) return;

    setError("");
    setSuccess("");

    if (!currentUserId) {
      setError("Norėdami siūlyti kainą, prisijunkite.");
      return;
    }

    const offeredPrice = Number(amount.replace(",", "."));

    if (
      !Number.isFinite(offeredPrice) ||
      offeredPrice <= 0 ||
      !/^\d+([.,]\d{1,2})?$/.test(amount.trim())
    ) {
      setError("Įveskite teisingą kainą eurais.");
      return;
    }

    if (message.length > 1000) {
      setError("Komentaras negali viršyti 1000 simbolių.");
      return;
    }

    setSending(true);

    try {
      const { error: queryError } = await supabase.rpc(
        "create_part_price_offer",
        {
          p_listing_id: listingId,
          p_offered_price: offeredPrice,
          p_message: message.trim() || null,
        }
      );

      if (queryError) throw queryError;

      setSuccess("Kainos pasiūlymas sėkmingai išsiųstas!");
      setAmount("");
      setMessage("");
      setOpen(false);
    } catch (err) {
      console.error("Kainos pasiūlymo klaida:", err);
      setError("Nepavyko išsiųsti pasiūlymo. Bandykite dar kartą.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setError("");
          setSuccess("");
        }}
        className="w-full rounded-xl border-2 border-[#426A70] px-4 py-3 font-bold text-[#426A70] hover:bg-slate-50"
      >
        💶 Siūlyti savo kainą
      </button>

      {open && (
        <form
          onSubmit={submitOffer}
          className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <p className="text-sm text-slate-600">
            Skelbimo kaina:{" "}
            <strong>{Number(price).toLocaleString("lt-LT")} €</strong>
          </p>

          <label className="block text-sm font-semibold">
            Jūsų siūloma kaina (€)
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Pvz., 120"
              required
              maxLength={14}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"
            />
          </label>

          <label className="block text-sm font-semibold">
            Komentaras (nebūtina)
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Pvz., galiu atsiimti šiandien."
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3"
            />
          </label>

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-lg bg-[#426A70] px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {sending ? "Siunčiama..." : "Išsiųsti pasiūlymą"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="mt-2 text-sm text-green-700">
          {success}
        </p>
      )}
    </div>
  );
}