"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const targetUserId = "b0854c8a-7109-4399-aed7-06cd1b383af1";

const description = [
  "BANDOMASIS SKELBIMAS - NEPARDUODAMA.",
  "2018 m. Volkswagen Passat 2.0 TDI, 110 kW.",
  "Skelbimas skirtas AUTO MOTO DALYS funkcijoms bandyti.",
  "",
  "TECHNINĖ INFORMACIJA",
  "Rida: 185000 km",
  "Kuro tipas: Dyzelinas",
  "Variklio tūris: 1968 cm³",
  "Variklio galia: 110 kW",
  "Pavarų dėžė: Automatinė",
  "Kėbulas: Universalas",
  "Varantieji ratai: Priekiniai",
  "Spalva: Pilka",
  "TA iki: 2027-06",
  "",
  "YPATUMAI IR ĮRANGA",
  "✓ Šildomos priekinės sėdynės",
  "✓ Klimato kontrolė",
  "✓ Adaptyvioji greičio palaikymo sistema",
  "✓ Galinio vaizdo kamera",
  "✓ Apple CarPlay",
  "✓ LED žibintai",
  "",
  "DEFEKTAI IR REMONTAI",
  "Nedideli kėbulo įbrėžimai.",
  "Pakeisti stabdžių diskai ir kaladėlės.",
].join("\n");

export default function DemoListingPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [listingId, setListingId] = useState<string | null>(null);

  async function createDemo() {
    if (busy || listingId) return;

    setBusy(true);
    setMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Pirmiausia prisijunk prie svetainės.");
      }

      if (authData.user.id !== targetUserId) {
        throw new Error(
          "Prisijungta prie kitos paskyros. Skelbimas nesukurtas."
        );
      }

      const { data: existing, error: checkError } = await supabase
        .from("listings")
        .select("id")
        .eq("seller_id", targetUserId)
        .eq("title", "BANDOMASIS - Volkswagen Passat 2018")
        .limit(1);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        setListingId(existing[0].id);
        setMessage("Toks bandomasis skelbimas jau yra tavo paskyroje.");
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .insert({
          seller_id: authData.user.id,
          sale_type: "vehicle",
          category: "car",
          title: "BANDOMASIS - Volkswagen Passat 2018",
          manufacturer: "Volkswagen",
          model: "Passat",
          year: 2018,
          price: 12500,
          condition: "used",
          status: "active",
          description,
        })
        .select("id")
        .single();

      if (error) throw error;

      setListingId(data.id);
      setMessage("1 - Bandomasis skelbimas sėkmingai sukurtas!");
    } catch (error) {
      setMessage(
        "0 - " +
          (error instanceof Error ? error.message : "Nežinoma klaida.")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 p-8">
      <h1 className="text-2xl font-bold">
        Bandomojo skelbimo kūrimas
      </h1>

      <p>Volkswagen Passat 2018 · 12 500 €</p>

      <p className="text-sm text-slate-600">
        Skelbimas bus priskirtas tik prisijungusiam
        vartotojui, kurio ID sutampa su nurodytu.
      </p>

      <button
        type="button"
        onClick={() => void createDemo()}
        disabled={busy || Boolean(listingId)}
        className="rounded-xl bg-teal-700 px-5 py-3 font-bold text-white disabled:opacity-50"
      >
        {busy ? "Kuriama..." : "Sukurti bandomąjį skelbimą"}
      </button>

      {message && <p className="font-semibold">{message}</p>}

      {listingId && (
        <div className="space-y-3">
          <Link
            href={`/listings/${listingId}`}
            className="block font-bold text-teal-700 underline"
          >
            Atidaryti bandomąjį skelbimą
          </Link>

          <Link
            href="/my-listings"
            className="block font-bold text-teal-700 underline"
          >
            Patikrinti „Mano skelbimai“
          </Link>
        </div>
      )}
    </main>
  );
}
