
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [sellerType, setSellerType] = useState("private");
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user }, error: userError } =
        await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setMessage("Nepavyko įkelti profilio duomenų.");
      } else if (data) {
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setSellerType(data.seller_type ?? "private");
        setCompanyName(data.company_name ?? "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        seller_type: sellerType,
        company_name: sellerType === "business" ? companyName.trim() : null,
      });

    if (error) {
      setMessage("Nepavyko išsaugoti duomenų. Bandyk dar kartą.");
    } else {
      setMessage("Profilio duomenys sėkmingai išsaugoti!");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Įkeliamas profilis...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/" className="font-semibold text-orange-600 hover:text-orange-700">
            ← AUTO MOTO DALYS
          </Link>
        </div>

        <form
          onSubmit={saveProfile}
          className="space-y-6 rounded-2xl bg-white p-8 shadow-lg"
        >
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Mano profilis
            </h1>
            <p className="mt-2 text-slate-500">
              Užpildyk savo paskyros informaciją.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-semibold text-slate-700">
              El. paštas
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-lg border bg-slate-100 p-3 text-slate-500"
            />
          </div>

          <div>
            <label htmlFor="fullName" className="mb-2 block font-semibold text-slate-700">
              Vardas ir pavardė
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-orange-500"
              placeholder="Tavo vardas ir pavardė"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block font-semibold text-slate-700">
              Telefono numeris
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-orange-500"
              placeholder="+370 600 00000"
            />
          </div>

          <div>
            <label className="mb-3 block font-semibold text-slate-700">
              Paskyros tipas
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSellerType("private")}
                className={`rounded-lg border p-4 text-left ${
                  sellerType === "private"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="block font-bold">Privatus pardavėjas</span>
                <span className="mt-1 block text-sm">Parduodu kaip fizinis asmuo</span>
              </button>

              <button
                type="button"
                onClick={() => setSellerType("business")}
                className={`rounded-lg border p-4 text-left ${
                  sellerType === "business"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="block font-bold">Verslo paskyra</span>
                <span className="mt-1 block text-sm">Parduodu kaip įmonė</span>
              </button>
            </div>
          </div>

          {sellerType === "business" && (
            <div>
              <label htmlFor="companyName" className="mb-2 block font-semibold text-slate-700">
                Įmonės pavadinimas
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-orange-500"
                placeholder="Įmonės pavadinimas"
                required
              />
            </div>
          )}

          {message && (
            <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-orange-500 p-3 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? "Saugoma..." : "Išsaugoti profilį"}
          </button>
        </form>
      </div>
    </main>
  );
}
