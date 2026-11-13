
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DonorVehicle = {
  id: string;
  seller_id: string;
  vin: string;
  manufacturer: string;
  model: string;
  vehicle_generation: string | null;
  year: number | null;
  engine_code: string | null;
  engine_capacity: string | null;
  fuel_type: string | null;
  body_type: string | null;
  market_region: string | null;
  steering_side: string | null;
  color: string | null;
  mileage_km: number | null;
  acquired_at: string | null;
  acquisition_document_number: string | null;
  supplier_name: string | null;
  provenance_notes: string | null;
  verification_status: string;
  status: string;
  created_at: string;
};

type DonorForm = {
  vin: string;
  manufacturer: string;
  model: string;
  vehicle_generation: string;
  year: string;
  engine_code: string;
  engine_capacity: string;
  fuel_type: string;
  body_type: string;
  market_region: string;
  steering_side: string;
  color: string;
  mileage_km: string;
  acquired_at: string;
  acquisition_document_number: string;
  supplier_name: string;
  provenance_notes: string;
};

type DonorPart = {
  id: string;
  donor_vehicle_id: string;
  title: string;
  internal_code: string | null;
  external_id: string | null;
  price: number | null;
  warehouse_location: string | null;
  status: string | null;
};

const emptyForm: DonorForm = {
  vin: "",
  manufacturer: "",
  model: "",
  vehicle_generation: "",
  year: "",
  engine_code: "",
  engine_capacity: "",
  fuel_type: "",
  body_type: "",
  market_region: "",
  steering_side: "",
  color: "",
  mileage_km: "",
  acquired_at: "",
  acquisition_document_number: "",
  supplier_name: "",
  provenance_notes: "",
};

const inputStyle =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#24333D] outline-none focus:border-[#426A70] focus:ring-2 focus:ring-[#426A70]/15";

const buttonStyle =
  "rounded-xl bg-[#426A70] px-5 py-3 font-bold text-white hover:bg-[#35565B] disabled:opacity-50";

const secondaryButtonStyle =
  "rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

function maskVin(vin: string) {
  if (vin.length !== 17) return "VIN nenurodytas";
  return vin.slice(0, 3) + "••••••••" + vin.slice(-6);
}

function statusLabel(status: string) {
  switch (status) {
    case "registered":
      return "Registruotas";
    case "dismantling":
      return "Ardomas";
    case "dismantled":
      return "Išardytas";
    case "archived":
      return "Archyvuotas";
    default:
      return status;
  }
}

function partStatusLabel(status: string | null) {
  switch (status) {
    case "active":
      return "Aktyvi";
    case "reserved":
      return "Rezervuota";
    case "paid":
      return "Apmokėta";
    case "shipped":
      return "Išsiųsta";
    case "sold":
      return "Parduota";
    default:
      return status || "Nenurodyta";
  }
}

function formatPrice(price: number | null) {
  if (price === null) return "Nenurodyta";

  return Number(price).toLocaleString("lt-LT", {
    style: "currency",
    currency: "EUR",
  });
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-[#24333D]">
        {value}
      </p>
    </div>
  );
}

export default function DonorVehiclesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [donors, setDonors] = useState<DonorVehicle[]>([]);
  const [form, setForm] = useState<DonorForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [selectedDonor, setSelectedDonor] =
    useState<DonorVehicle | null>(null);

  // NAUJA: DONORINIO AUTOMOBILIO DETALIŲ APSKAITA

  const [donorParts, setDonorParts] = useState<DonorPart[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [partsError, setPartsError] = useState("");
  const [partsLoaded, setPartsLoaded] = useState(false);

  const loadDonors = useCallback(async (sellerId: string) => {
    const { data, error } = await supabase
      .from("donor_vehicles")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(
        "Nepavyko gauti donorų: " + error.message
      );
      return;
    }

    setDonors((data ?? []) as DonorVehicle[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !user) {
        setMessage(
          "Norėdamas valdyti automobilius, prisijunk."
        );
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadDonors(user.id);

      if (active) {
        setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [loadDonors]);

  function updateField<K extends keyof DonorForm>(
    field: K,
    value: DonorForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateForm() {
    setForm(emptyForm);
    setSelectedDonor(null);
    setDonorParts([]);
    setPartsLoaded(false);
    setPartsError("");
    setMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!userId || saving) return;

    const vin = form.vin.trim().toUpperCase();

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      setMessage(
        "VIN turi būti 17 simbolių, be I, O ir Q raidžių."
      );
      return;
    }

    if (
      !form.manufacturer.trim() ||
      !form.model.trim()
    ) {
      setMessage(
        "Įrašyk automobilio markę ir modelį."
      );
      return;
    }

    const parsedYear = form.year
      ? Number(form.year)
      : null;

    const parsedMileage = form.mileage_km
      ? Number(form.mileage_km)
      : null;

    if (
      parsedYear !== null &&
      (!Number.isInteger(parsedYear) ||
        parsedYear < 1900 ||
        parsedYear > 2100)
    ) {
      setMessage(
        "Įrašyk teisingus automobilio metus."
      );
      return;
    }

    if (
      parsedMileage !== null &&
      (!Number.isInteger(parsedMileage) ||
        parsedMileage < 0)
    ) {
      setMessage("Įrašyk teisingą ridą.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("donor_vehicles")
        .insert({
          seller_id: userId,
          vin,
          manufacturer: form.manufacturer.trim(),
          model: form.model.trim(),
          vehicle_generation:
            form.vehicle_generation.trim() || null,
          year: parsedYear,
          engine_code:
            form.engine_code.trim() || null,
          engine_capacity:
            form.engine_capacity.trim() || null,
          fuel_type: form.fuel_type || null,
          body_type:
            form.body_type.trim() || null,
          market_region:
            form.market_region || null,
          steering_side:
            form.steering_side || null,
          color: form.color.trim() || null,
          mileage_km: parsedMileage,
          acquired_at: form.acquired_at || null,
          acquisition_document_number:
            form.acquisition_document_number.trim() ||
            null,
          supplier_name:
            form.supplier_name.trim() || null,
          provenance_notes:
            form.provenance_notes.trim() || null,
          verification_status: "unverified",
          status: "registered",
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Automobilis su tokiu VIN jau užregistruotas."
          );
        }

        throw new Error(error.message);
      }

      setForm(emptyForm);
      setShowForm(false);
      setMessage(
        "Automobilis donoras sėkmingai užregistruotas."
      );

      await loadDonors(userId);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Nepavyko išsaugoti automobilio."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    donor: DonorVehicle,
    newStatus: string
  ) {
    if (!userId || saving) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("donor_vehicles")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", donor.id)
      .eq("seller_id", userId);

    if (error) {
      setMessage(
        "Nepavyko pakeisti būsenos: " +
          error.message
      );
    } else {
      await loadDonors(userId);

      setSelectedDonor((current) =>
        current?.id === donor.id
          ? { ...current, status: newStatus }
          : current
      );
    }

    setSaving(false);
  }

  // NAUJA: VISŲ DONORO DETALIŲ UŽKROVIMAS
  // Užklausa filtruojama pagal donorą ir pardavėją.
  // Puslapiuojame, kad neprarastume įrašų virš 1000.

  const loadDonorParts = useCallback(
    async (donorId: string, sellerId: string) => {
      setLoadingParts(true);
      setPartsError("");
      setPartsLoaded(false);

      try {
        const allParts: DonorPart[] = [];
        const pageSize = 500;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from("listings")
            .select(
              "id, donor_vehicle_id, title, internal_code, external_id, price, warehouse_location, status"
            )
            .eq("seller_id", sellerId)
            .eq("donor_vehicle_id", donorId)
            .order("id", { ascending: true })
            .range(from, from + pageSize - 1);

          if (error) throw error;

          const batch = (data ?? []) as DonorPart[];

          allParts.push(...batch);

          hasMore = batch.length === pageSize;
          from += pageSize;
        }

        setDonorParts(allParts);
        setPartsLoaded(true);
      } catch (error) {
        setDonorParts([]);
        setPartsError(
          error instanceof Error
            ? "Nepavyko gauti detalių: " +
                error.message
            : "Nepavyko gauti donorinio automobilio detalių."
        );
      } finally {
        setLoadingParts(false);
      }
    },
    []
  );

  async function toggleDonor(donor: DonorVehicle) {
    if (selectedDonor?.id === donor.id) {
      setSelectedDonor(null);
      setDonorParts([]);
      setPartsError("");
      setPartsLoaded(false);
      return;
    }

    setSelectedDonor(donor);
    setDonorParts([]);
    setPartsError("");
    setPartsLoaded(false);

    if (userId) {
      await loadDonorParts(donor.id, userId);
    }
  }

  const activeCount = donorParts.filter(
    (part) => part.status === "active"
  ).length;

  const reservedCount = donorParts.filter(
    (part) => part.status === "reserved"
  ).length;

  const soldCount = donorParts.filter(
    (part) => part.status === "sold"
  ).length;

  const paidCount = donorParts.filter(
    (part) => part.status === "paid"
  ).length;

  const shippedCount = donorParts.filter(
    (part) => part.status === "shipped"
  ).length;

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[#24333D]">
              Automobiliai donorai
            </h1>

            <p className="mt-2 text-slate-600">
              Registruok ardomus automobilius, jų
              kilmės duomenis ir valdyk iš jų
              išimtas detales.
            </p>
          </div>

          {userId && (
            <button
              type="button"
              onClick={openCreateForm}
              className={buttonStyle}
            >
              + Pridėti automobilį
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-slate-600">
            Kraunami automobiliai...
          </div>
        ) : !userId ? (
          <div className="rounded-2xl bg-white p-8 text-slate-600">
            Norėdamas registruoti automobilius,
            prisijunk.
          </div>
        ) : (
          <>
            {message && (
              <div
                role="status"
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-[#24333D]"
              >
                {message}
              </div>
            )}

            {showForm && (
              <form
                onSubmit={handleSave}
                className="space-y-6 rounded-2xl bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-[#24333D]">
                    Naujas automobilis donoras
                  </h2>

                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="text-sm font-semibold text-slate-600 hover:text-[#24333D]"
                  >
                    Uždaryti
                  </button>
                </div>

                <label className="block font-semibold text-[#24333D]">
                  VIN kodas *

                  <input
                    required
                    minLength={17}
                    maxLength={17}
                    value={form.vin}
                    onChange={(e) =>
                      updateField(
                        "vin",
                        e.target.value.toUpperCase()
                      )
                    }
                    className={inputStyle}
                    placeholder="17 simbolių VIN"
                  />

                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Pilnas VIN bus matomas tik pardavėjui.
                  </span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block font-semibold text-[#24333D]">
                    Markė *

                    <input
                      required
                      value={form.manufacturer}
                      onChange={(e) =>
                        updateField(
                          "manufacturer",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                      placeholder="Pvz., BMW"
                    />
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Modelis *

                    <input
                      required
                      value={form.model}
                      onChange={(e) =>
                        updateField(
                          "model",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                      placeholder="Pvz., 320d"
                    />
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Modelio karta

                    <input
                      value={form.vehicle_generation}
                      onChange={(e) =>
                        updateField(
                          "vehicle_generation",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                      placeholder="Pvz., E90"
                    />
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Metai

                    <input
                      type="number"
                      min="1900"
                      max="2100"
                      value={form.year}
                      onChange={(e) =>
                        updateField(
                          "year",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                    />
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Variklio kodas

                    <input
                      value={form.engine_code}
                      onChange={(e) =>
                        updateField(
                          "engine_code",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                      placeholder="Pvz., N47D20"
                    />
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Variklio tūris

                    <input
                      value={form.engine_capacity}
                      onChange={(e) =>
                        updateField(
                          "engine_capacity",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                      placeholder="Pvz., 2.0"
                    />
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Kuro tipas

                    <select
                      value={form.fuel_type}
                      onChange={(e) =>
                        updateField(
                          "fuel_type",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                    >
                      <option value="">Nenurodyta</option>
                      <option value="diesel">
                        Dyzelinas
                      </option>
                      <option value="petrol">
                        Benzinas
                      </option>
                      <option value="hybrid">
                        Hibridas
                      </option>
                      <option value="electric">
                        Elektra
                      </option>
                      <option value="lpg">
                        Dujos
                      </option>
                      <option value="other">
                        Kita
                      </option>
                    </select>
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Kėbulo tipas

                    <input
                      value={form.body_type}
                      onChange={(e) =>
                        updateField(
                          "body_type",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                      placeholder="Pvz., sedanas"
                    />
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Rinkos versija

                    <select
                      value={form.market_region}
                      onChange={(e) =>
                        updateField(
                          "market_region",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                    >
                      <option value="">Nenurodyta</option>
                      <option value="EU">
                        Europinė (EU)
                      </option>
                      <option value="UK">
                        Angliška (UK)
                      </option>
                      <option value="US">
                        Amerikietiška (US)
                      </option>
                      <option value="OTHER">
                        Kita
                      </option>
                    </select>
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Vairo pusė

                    <select
                      value={form.steering_side}
                      onChange={(e) =>
                        updateField(
                          "steering_side",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                    >
                      <option value="">Nenurodyta</option>
                      <option value="LHD">
                        Kairėje (LHD)
                      </option>
                      <option value="RHD">
                        Dešinėje (RHD)
                      </option>
                    </select>
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Spalva

                    <input
                      value={form.color}
                      onChange={(e) =>
                        updateField(
                          "color",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                      placeholder="Pvz., sidabrinė"
                    />
                  </label>

                  <label className="block font-semibold text-[#24333D]">
                    Rida (km)

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.mileage_km}
                      onChange={(e) =>
                        updateField(
                          "mileage_km",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                    />
                  </label>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="mb-4 text-lg font-bold text-[#24333D]">
                    Automobilio kilmės informacija
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block font-semibold text-[#24333D]">
                      Įsigijimo data

                      <input
                        type="date"
                        value={form.acquired_at}
                        onChange={(e) =>
                          updateField(
                            "acquired_at",
                            e.target.value
                          )
                        }
                        className={inputStyle}
                      />
                    </label>

                    <label className="block font-semibold text-[#24333D]">
                      Dokumento numeris

                      <input
                        value={
                          form.acquisition_document_number
                        }
                        onChange={(e) =>
                          updateField(
                            "acquisition_document_number",
                            e.target.value
                          )
                        }
                        className={inputStyle}
                        placeholder="Sutarties arba sąskaitos numeris"
                      />
                    </label>

                    <label className="block font-semibold text-[#24333D]">
                      Tiekėjas

                      <input
                        value={form.supplier_name}
                        onChange={(e) =>
                          updateField(
                            "supplier_name",
                            e.target.value
                          )
                        }
                        className={inputStyle}
                        placeholder="Įmonė arba pardavėjas"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block font-semibold text-[#24333D]">
                    Papildomos kilmės pastabos

                    <textarea
                      rows={3}
                      value={form.provenance_notes}
                      onChange={(e) =>
                        updateField(
                          "provenance_notes",
                          e.target.value
                        )
                      }
                      className={inputStyle}
                      placeholder="Papildoma informacija apie automobilio įsigijimą..."
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className={buttonStyle}
                  >
                    {saving
                      ? "Saugoma..."
                      : "Užregistruoti automobilį"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeForm}
                    className={secondaryButtonStyle}
                  >
                    Atšaukti
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#24333D]">
                  Mano automobiliai donorai
                </h2>

                <span className="rounded-full bg-[#EDF4F2] px-4 py-2 text-sm font-bold text-[#426A70]">
                  Iš viso: {donors.length}
                </span>
              </div>

              {donors.length === 0 ? (
                <p className="rounded-xl bg-[#F5F7F6] p-6 text-slate-600">
                  Kol kas automobilių donorų nėra.
                  Pridėk pirmąjį automobilį.
                </p>
              ) : (
                <div className="space-y-3">
                  {donors.map((donor) => (
                    <div
                      key={donor.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-[#24333D]">
                            {donor.manufacturer}{" "}
                            {donor.model}
                            {donor.vehicle_generation
                              ? ` ${donor.vehicle_generation}`
                              : ""}
                          </h3>

                          <p className="mt-1 text-sm text-slate-600">
                            {donor.year
                              ? `${donor.year} m. · `
                              : ""}
                            VIN: {maskVin(donor.vin)}
                          </p>

                          <p className="mt-2 text-sm font-semibold text-[#426A70]">
                            {statusLabel(donor.status)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/sell?donor_vehicle_id=${encodeURIComponent(
                              donor.id
                            )}`}
                            className="rounded-lg bg-[#426A70] px-4 py-2 text-sm font-bold text-white hover:bg-[#35565B]"
                          >
                            + Pridėti detalę
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              void toggleDonor(donor)
                            }
                            className="rounded-lg border border-[#9BB5B7] px-4 py-2 text-sm font-semibold text-[#426A70] hover:bg-[#EDF4F2]"
                          >
                            {selectedDonor?.id === donor.id
                              ? "Uždaryti"
                              : "Peržiūrėti"}
                          </button>
                        </div>
                      </div>

                      {selectedDonor?.id === donor.id && (
                        <div className="mt-5 space-y-6 border-t border-slate-200 pt-5">
                          {/* ORIGINALI DONORO INFORMACIJA */}

                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <p>
                              <span className="font-semibold">
                                Pilnas VIN:
                              </span>{" "}
                              {donor.vin}
                            </p>

                            <p>
                              <span className="font-semibold">
                                Variklis:
                              </span>{" "}
                              {donor.engine_code ||
                                "Nenurodyta"}
                            </p>

                            <p>
                              <span className="font-semibold">
                                Rida:
                              </span>{" "}
                              {donor.mileage_km !== null
                                ? `${donor.mileage_km.toLocaleString(
                                    "lt-LT"
                                  )} km`
                                : "Nenurodyta"}
                            </p>

                            <p>
                              <span className="font-semibold">
                                Kilmės dokumentas:
                              </span>{" "}
                              {donor.acquisition_document_number ||
                                "Nenurodyta"}
                            </p>

                            <p>
                              <span className="font-semibold">
                                Tiekėjas:
                              </span>{" "}
                              {donor.supplier_name ||
                                "Nenurodyta"}
                            </p>

                            <p>
                              <span className="font-semibold">
                                Kilmės patikra:
                              </span>{" "}
                              {donor.verification_status ===
                              "verified"
                                ? "Patikrinta"
                                : "Nepatvirtinta"}
                            </p>
                          </div>

                          <label className="block max-w-xs text-sm font-semibold text-[#24333D]">
                            Ardymo būsena

                            <select
                              value={donor.status}
                              disabled={saving}
                              onChange={(e) =>
                                void changeStatus(
                                  donor,
                                  e.target.value
                                )
                              }
                              className={inputStyle}
                            >
                              <option value="registered">
                                Registruotas
                              </option>
                              <option value="dismantling">
                                Ardomas
                              </option>
                              <option value="dismantled">
                                Išardytas
                              </option>
                              <option value="archived">
                                Archyvuotas
                              </option>
                            </select>
                          </label>

                          {/* NAUJA: DONORO DETALIŲ APSKAITA */}

                          <div className="rounded-2xl border border-[#9BB5B7] bg-[#F5F7F6] p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h4 className="text-xl font-black text-[#24333D]">
                                  🔧 Donoro detalių apskaita
                                </h4>

                                <p className="mt-1 text-sm text-slate-600">
                                  Visos su šiuo automobiliu
                                  susietos detalės.
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  userId &&
                                  void loadDonorParts(
                                    donor.id,
                                    userId
                                  )
                                }
                                disabled={loadingParts}
                                className={secondaryButtonStyle}
                              >
                                {loadingParts
                                  ? "Atnaujinama..."
                                  : "↻ Atnaujinti"}
                              </button>
                            </div>

                            {loadingParts ? (
                              <p className="mt-5 text-sm text-slate-600">
                                Kraunamos donorinio
                                automobilio detalės...
                              </p>
                            ) : partsError ? (
                              <div
                                role="alert"
                                className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                              >
                                {partsError}
                              </div>
                            ) : partsLoaded ? (
                              <>
                                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                  <StatCard
                                    label="Iš viso detalių"
                                    value={
                                      donorParts.length
                                    }
                                  />

                                  <StatCard
                                    label="Aktyvios"
                                    value={activeCount}
                                  />

                                  <StatCard
                                    label="Rezervuotos"
                                    value={reservedCount}
                                  />

                                  <StatCard
                                    label="Apmokėtos"
                                    value={paidCount}
                                  />

                                  <StatCard
                                    label="Išsiųstos"
                                    value={shippedCount}
                                  />

                                  <StatCard
                                    label="Parduotos"
                                    value={soldCount}
                                  />
                                </div>

                                <div className="mt-6">
                                  <h5 className="text-lg font-bold text-[#24333D]">
                                    Detalių sąrašas
                                  </h5>

                                  {donorParts.length === 0 ? (
                                    <div className="mt-3 rounded-xl bg-white p-5 text-sm text-slate-600">
                                      Šiam donoriniam
                                      automobiliui dar nėra
                                      priskirtų detalių.

                                      <div className="mt-4">
                                        <Link
                                          href={`/sell?donor_vehicle_id=${encodeURIComponent(
                                            donor.id
                                          )}`}
                                          className="inline-block rounded-lg bg-[#426A70] px-4 py-2 font-bold text-white"
                                        >
                                          + Pridėti pirmą detalę
                                        </Link>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-3 space-y-3">
                                      {donorParts.map(
                                        (part) => (
                                          <div
                                            key={part.id}
                                            className="rounded-xl border border-slate-200 bg-white p-4"
                                          >
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                              <div>
                                                <p className="font-bold text-[#24333D]">
                                                  {part.title}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-600">
                                                  AMD:{" "}
                                                  <span className="font-semibold">
                                                    {part.internal_code ||
                                                      "Nėra"}
                                                  </span>
                                                </p>

                                                {part.external_id && (
                                                  <p className="mt-1 text-sm text-slate-600">
                                                    RRR / išorinis ID:{" "}
                                                    {part.external_id}
                                                  </p>
                                                )}
                                              </div>

                                              <span className="rounded-full bg-[#EDF4F2] px-3 py-1 text-xs font-bold text-[#426A70]">
                                                {partStatusLabel(
                                                  part.status
                                                )}
                                              </span>
                                            </div>

                                            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                              <div>
                                                <p className="text-xs font-semibold uppercase text-slate-500">
                                                  Kaina
                                                </p>

                                                <p className="mt-1 font-bold text-[#24333D]">
                                                  {formatPrice(
                                                    part.price
                                                  )}
                                                </p>
                                              </div>

                                              <div>
                                                <p className="text-xs font-semibold uppercase text-slate-500">
                                                  Sandėlio vieta
                                                </p>

                                                <p className="mt-1 font-bold text-[#24333D]">
                                                  {part.warehouse_location ||
                                                    "Nepriskirta"}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="mt-4 border-t border-slate-100 pt-4">
                                              <Link
                                                href={`/my-listings/${part.id}/edit`}
                                                className="inline-block rounded-lg border border-[#9BB5B7] px-4 py-2 text-sm font-bold text-[#426A70] hover:bg-[#EDF4F2]"
                                              >
                                                ✏️ Redaguoti detalę
                                              </Link>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
