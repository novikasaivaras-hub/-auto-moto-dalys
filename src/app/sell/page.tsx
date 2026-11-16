
"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import PartCatalogPicker from "@/components/PartCatalogPicker";
import VehicleListingForm from "@/components/VehicleListingForm";

const MAX_IMAGES = 6;
const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type SaleType = "part" | "vehicle";
type PartType = "part" | "set";

type WarehouseLocation = {
  id: string;
  code: string;
  description: string | null;
};

type DonorVehicle = {
  id: string;
  seller_id: string;
  vin: string;
  manufacturer: string;
  model: string;
  vehicle_generation: string | null;
  year: number | null;
  engine_code: string | null;
  market_region: string | null;
  steering_side: string | null;
  status: string;
};

export default function SellPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saleType, setSaleType] = useState<SaleType>("part");
  const [partType, setPartType] = useState<PartType>("part");

  const [title, setTitle] = useState("");
  const [partCatalogId, setPartCatalogId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("car");
  const [condition, setCondition] = useState("used");

  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [vehicleGeneration, setVehicleGeneration] = useState("");
  const [year, setYear] = useState("");
  const [oemNumber, setOemNumber] = useState("");
  const [marketRegion, setMarketRegion] = useState("");
  const [steeringSide, setSteeringSide] = useState("");
  const [damageNotes, setDamageNotes] = useState("");

  const [donorVehicle, setDonorVehicle] =
    useState<DonorVehicle | null>(null);
  const [donorLoading, setDonorLoading] = useState(true);
  const [donorError, setDonorError] = useState("");
  const [requestedDonorId, setRequestedDonorId] =
    useState<string | null>(null);

  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState("");

  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationCode, setNewLocationCode] = useState("");
  const [newLocationDescription, setNewLocationDescription] =
    useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const inputStyle =
    "mt-2 w-full rounded-xl border border-[#D9E2E0] bg-white p-3 text-[#24333D] outline-none focus:border-[#426A70] focus:ring-2 focus:ring-[#426A70]/15";

  // --------------------------------------------------
  // NUOTRAUKŲ PERŽIŪROS
  // --------------------------------------------------

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // --------------------------------------------------
  // AUTOMOBILIO DONORO DUOMENYS
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadDonorVehicle() {
      setDonorLoading(true);
      setDonorError("");

      const params = new URLSearchParams(window.location.search);
      const donorId = params.get("donor_vehicle_id");

      setRequestedDonorId(donorId);

      if (!donorId) {
        if (active) {
          setDonorVehicle(null);
          setDonorLoading(false);
        }
        return;
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error(
            "Norėdamas kurti detalę iš donoro, prisijunk."
          );
        }

        const { data, error } = await supabase
          .from("donor_vehicles")
          .select(
            "id, seller_id, vin, manufacturer, model, vehicle_generation, year, engine_code, market_region, steering_side, status"
          )
          .eq("id", donorId)
          .eq("seller_id", user.id)
          .single();

        if (error || !data) {
          throw new Error(
            "Nepavyko rasti automobilio donoro. " +
              (error?.message ?? "")
          );
        }

        if (!active) return;

        const donor = data as DonorVehicle;

        setDonorVehicle(donor);
        setSaleType("part");
        setCategory("car");

        setManufacturer(donor.manufacturer || "");
        setModel(donor.model || "");
        setVehicleGeneration(donor.vehicle_generation || "");
        setYear(
          donor.year !== null && donor.year !== undefined
            ? String(donor.year)
            : ""
        );
        setMarketRegion(donor.market_region || "");
        setSteeringSide(donor.steering_side || "");
      } catch (error) {
        if (!active) return;

        setDonorVehicle(null);
        setDonorError(
          error instanceof Error
            ? error.message
            : "Nepavyko įkelti automobilio donoro."
        );
      } finally {
        if (active) setDonorLoading(false);
      }
    }

    void loadDonorVehicle();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // SANDĖLIO VIETŲ ĮKĖLIMAS
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      setLocationsLoading(true);
      setLocationsError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        setLocations([]);
        setLocationsError(
          "Prisijunk, kad galėtum pasirinkti sandėlio vietą."
        );
        setLocationsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("warehouse_locations")
        .select("id, code, description")
        .eq("seller_id", user.id)
        .order("code", { ascending: true });

      if (!active) return;

      if (error) {
        setLocations([]);
        setLocationsError(
          "Nepavyko įkelti sandėlio vietų: " + error.message
        );
      } else {
        setLocations(data ?? []);
      }

      setLocationsLoading(false);
    }

    void loadLocations();

    return () => {
      active = false;
    };
  }, []);

  // --------------------------------------------------
  // SANDĖLIO VIETŲ PAIEŠKA
  // --------------------------------------------------

  const normalizedLocationQuery = locationQuery
    .trim()
    .toLocaleLowerCase("lt");

  const filteredLocations = locations.filter((location) => {
    if (!normalizedLocationQuery) return true;

    return (
      location.code
        .toLocaleLowerCase("lt")
        .includes(normalizedLocationQuery) ||
      (location.description ?? "")
        .toLocaleLowerCase("lt")
        .includes(normalizedLocationQuery)
    );
  });

  function selectLocation(location: WarehouseLocation) {
    setSelectedLocationId(location.id);
    setLocationQuery(location.code);
    setLocationSearchOpen(false);
    setLocationMessage("");
  }

  function clearLocation() {
    setSelectedLocationId("");
    setLocationQuery("");
    setLocationSearchOpen(false);
  }

  function handleLocationQueryChange(value: string) {
    setLocationQuery(value);
    setSelectedLocationId("");
    setLocationSearchOpen(true);
    setLocationMessage("");
  }

  function openAddLocation() {
    setNewLocationCode(locationQuery.trim().toUpperCase());
    setNewLocationDescription("");
    setLocationMessage("");
    setLocationSearchOpen(false);
    setShowAddLocation(true);
  }

  function closeAddLocation() {
    if (savingLocation) return;

    setShowAddLocation(false);
    setNewLocationCode("");
    setNewLocationDescription("");
    setLocationMessage("");
  }

  // --------------------------------------------------
  // NAUJOS SANDĖLIO VIETOS KŪRIMAS
  //
  // SVARBU:
  // Čia nereikia atskiro <form>.
  // Funkcija kviečiama per type="button".
  // --------------------------------------------------

  async function handleCreateLocation() {
    if (savingLocation || loading) return;

    const normalizedCode = newLocationCode.trim().toUpperCase();

    if (!normalizedCode) {
      setLocationMessage("Įrašyk sandėlio vietos kodą.");
      return;
    }

    const existingLocation = locations.find(
      (location) =>
        location.code.toUpperCase() === normalizedCode
    );

    if (existingLocation) {
      selectLocation(existingLocation);
      setShowAddLocation(false);
      setNewLocationCode("");
      setNewLocationDescription("");
      return;
    }

    setSavingLocation(true);
    setLocationMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Norėdamas kurti sandėlio vietą, prisijunk."
        );
      }

      const { data, error } = await supabase
        .from("warehouse_locations")
        .insert({
          seller_id: user.id,
          code: normalizedCode,
          description: newLocationDescription.trim() || null,
        })
        .select("id, code, description")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Tokia sandėlio vieta jau yra. Atnaujink puslapį ir pasirink ją."
          );
        }

        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(
          "Nepavyko gauti naujos sandėlio vietos."
        );
      }

      const createdLocation = data as WarehouseLocation;

      setLocations((current) =>
        [...current, createdLocation].sort((a, b) =>
          a.code.localeCompare(b.code, "lt")
        )
      );

      setSelectedLocationId(createdLocation.id);
      setLocationQuery(createdLocation.code);
      setLocationSearchOpen(false);
      setLocationsError("");
      setShowAddLocation(false);
      setNewLocationCode("");
      setNewLocationDescription("");
      setLocationMessage("");
      setMessage("");
    } catch (error) {
      setLocationMessage(
        error instanceof Error
          ? error.message
          : "Nepavyko sukurti sandėlio vietos."
      );
    } finally {
      setSavingLocation(false);
    }
  }

  // --------------------------------------------------
  // NUOTRAUKŲ PASIRINKIMAS
  // --------------------------------------------------

  function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    const selected = Array.from(files);

    if (images.length + selected.length > MAX_IMAGES) {
      setMessage("Galima pridėti daugiausia 6 nuotraukas.");
      event.target.value = "";
      return;
    }

    for (const file of selected) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setMessage("Leidžiami tik JPG, PNG ir WEBP formatai.");
        event.target.value = "";
        return;
      }

      if (file.size > MAX_ORIGINAL_SIZE) {
        setMessage(
          "Viena originali nuotrauka negali viršyti 10 MB."
        );
        event.target.value = "";
        return;
      }
    }

    setImages((current) => [...current, ...selected]);
    setMessage("");
    event.target.value = "";
  }

  function removeImage(index: number) {
    if (loading) return;

    setImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index)
    );

    setMessage("");
  }

  // --------------------------------------------------
  // NUOTRAUKŲ GLAUDINIMAS
  // --------------------------------------------------

  async function compressImage(file: File): Promise<File> {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.85,
    });

    return new File(
      [compressed],
      `${crypto.randomUUID()}.webp`,
      { type: "image/webp" }
    );
  }

  // --------------------------------------------------
  // SKELBIMO IŠSAUGOJIMAS
  // --------------------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || saleType !== "part") return;

    setLoading(true);
    setMessage("");
    setProgress("");

    let listingCreated = false;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Norėdamas įdėti skelbimą, prisijunk."
        );
      }

      if (donorLoading) {
        throw new Error(
          "Palauk, kol bus įkelti automobilio donoro duomenys."
        );
      }

      if (requestedDonorId && !donorVehicle) {
        throw new Error(
          "Automobilio donoras neįkeltas. Patikrink donoro informaciją prieš saugodamas."
        );
      }

      if (donorVehicle) {
        const { data: validDonor, error: donorCheckError } =
          await supabase
            .from("donor_vehicles")
            .select("id")
            .eq("id", donorVehicle.id)
            .eq("seller_id", user.id)
            .single();

        if (donorCheckError || !validDonor) {
          throw new Error(
            "Nepavyko patvirtinti automobilio donoro."
          );
        }
      }

      if (!title.trim()) {
        throw new Error("Įrašyk detalės pavadinimą.");
      }

      if (
        price.trim() === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0
      ) {
        throw new Error("Įrašyk teisingą kainą.");
      }

      if (locationsLoading || locationsError) {
        throw new Error(
          "Nepavyko patikrinti sandėlio vietų. Atnaujink puslapį."
        );
      }

      const selectedLocation = locations.find(
        (location) => location.id === selectedLocationId
      );

      if (selectedLocationId && !selectedLocation) {
        throw new Error(
          "Pasirink galiojančią sandėlio vietą."
        );
      }

      if (locationQuery.trim() && !selectedLocation) {
        throw new Error(
          "Sandėlio vietą pasirink iš pasiūlymų arba sukurk naują."
        );
      }

      if (
        year &&
        (
          !Number.isInteger(Number(year)) ||
          Number(year) < 1900 ||
          Number(year) > 2100
        )
      ) {
        throw new Error(
          "Įrašyk teisingus automobilio metus."
        );
      }

      setProgress("Kuriamas skelbimas...");

      const { data: listing, error: listingError } =
        await supabase
          .from("listings")
          .insert({
            seller_id: user.id,
            title: title.trim(),
            part_catalog_id: partCatalogId,
            description: description.trim() || null,
            price: Number(price),
            category,
            condition,

            manufacturer: manufacturer.trim() || null,
            model: model.trim() || null,
            vehicle_generation:
              vehicleGeneration.trim() || null,
            year: year ? Number(year) : null,
            oem_number: oemNumber.trim() || null,

            item_type: partType,
            market_region: marketRegion || null,
            steering_side: steeringSide || null,
            damage_notes: damageNotes.trim() || null,

            warehouse_location_id:
              selectedLocation?.id ?? null,
            warehouse_location:
              selectedLocation?.code ?? null,

            donor_vehicle_id:
              donorVehicle?.id ?? null,
          })
          .select("id, internal_code")
          .single();

      if (listingError || !listing) {
        throw new Error(
          listingError?.message ||
            "Nepavyko sukurti skelbimo."
        );
      }

      listingCreated = true;

      for (let i = 0; i < images.length; i++) {
        setProgress(
          `Glaudinama ir įkeliama nuotrauka ${
            i + 1
          } iš ${images.length}...`
        );

        const compressedFile = await compressImage(images[i]);

        const imagePath =
          `${user.id}/${listing.id}/` +
          `${crypto.randomUUID()}.webp`;

        const { error: uploadError } =
          await supabase.storage
            .from("listing-images")
            .upload(imagePath, compressedFile, {
              contentType: "image/webp",
              upsert: false,
            });

        if (uploadError) {
          throw new Error(
            "Nuotraukos įkėlimo klaida: " +
              uploadError.message
          );
        }

        const { error: imageRecordError } =
          await supabase
            .from("listing_images")
            .insert({
              listing_id: listing.id,
              image_path: imagePath,
              sort_order: i,
            });

        if (imageRecordError) {
          throw new Error(
            "Nepavyko susieti nuotraukos: " +
              imageRecordError.message
          );
        }
      }

      setProgress("Skelbimas sėkmingai sukurtas!");
      router.push("/my-listings");
      router.refresh();
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Įvyko nežinoma klaida.";

      setMessage(
        listingCreated
          ? "Skelbimas sukurtas, tačiau ne visos nuotraukos įkeltos. " +
              errorText +
              " Nekurk to paties skelbimo dar kartą."
          : errorText
      );
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  // --------------------------------------------------
  // PUSLAPIO VAIZDAS
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-7">
          <h1 className="text-3xl font-black text-[#24333D]">
            Įdėti skelbimą
          </h1>
          <p className="mt-2 text-slate-600">
            Pasirink, ką nori parduoti.
          </p>
        </div>

        {/* AUTOMOBILIS DONORAS */}

        {donorLoading && (
          <div className="mb-6 rounded-2xl border border-[#D9E2E0] bg-white p-5">
            <p className="text-sm text-slate-600">
              Tikrinami automobilio donoro duomenys...
            </p>
          </div>
        )}

        {donorError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5"
          >
            <h2 className="font-bold text-red-800">
              Nepavyko įkelti automobilio donoro
            </h2>
            <p className="mt-2 text-sm text-red-700">
              {donorError}
            </p>
            <Link
              href="/donor-vehicles"
              className="mt-3 inline-block text-sm font-bold text-[#426A70] underline"
            >
              Grįžti prie automobilių donorų
            </Link>
          </div>
        )}

        {donorVehicle && (
          <div className="mb-6 rounded-2xl border-2 border-[#426A70] bg-[#EDF4F2] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#426A70]">
                  Pasirinktas automobilis donoras
                </p>

                <h2 className="mt-2 text-xl font-black text-[#24333D]">
                  {donorVehicle.manufacturer}{" "}
                  {donorVehicle.model}
                  {donorVehicle.vehicle_generation
                    ? ` ${donorVehicle.vehicle_generation}`
                    : ""}
                </h2>

                <p className="mt-2 text-sm text-slate-700">
                  Metai: {donorVehicle.year ?? "Nenurodyti"}
                </p>

                {donorVehicle.engine_code && (
                  <p className="mt-1 text-sm text-slate-700">
                    Variklio kodas:{" "}
                    <span className="font-semibold">
                      {donorVehicle.engine_code}
                    </span>
                  </p>
                )}

                <p className="mt-1 text-sm text-slate-700">
                  VIN:{" "}
                  <span className="font-mono font-semibold">
                    {donorVehicle.vin}
                  </span>
                </p>
              </div>

              <span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#426A70]">
                ✓ Susieta su donoru
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-700">
              Automobilio duomenys užpildyti automatiškai.
              Įrašyk detalės pavadinimą, kainą ir kitą
              konkrečios detalės informaciją.
            </p>

            <Link
              href="/donor-vehicles"
              className="mt-3 inline-block text-sm font-semibold text-[#426A70] underline"
            >
              Grįžti į donorų sąrašą
            </Link>
          </div>
        )}

        {/* AUTO_MOTO_SELL_CHOICES_V1 */}
        <div className="mb-6">
          <h2 className="mb-4 text-xl font-bold text-[#24333D]">
            Ką norite parduoti?
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                label: "Automobilį",
                icon: "🚗",
                type: "vehicle" as SaleType,
                category: "car",
              },
              {
                label: "Motociklą",
                icon: "🏍️",
                type: "vehicle" as SaleType,
                category: "motorcycle",
              },
              {
                label: "Automobilio dalį",
                icon: "⚙️",
                type: "part" as SaleType,
                category: "car",
              },
              {
                label: "Motociklo dalį",
                icon: "🔧",
                type: "part" as SaleType,
                category: "motorcycle",
              },
            ].map((option) => {
              const selected =
                saleType === option.type &&
                category === option.category;

              return (
                <button
                  key={option.label}
                  type="button"
                  disabled={loading || Boolean(donorVehicle)}
                  onClick={() => {
                    setSaleType(option.type);
                    setCategory(option.category);
                    setPartCatalogId(null);
                    setMessage("");
                  }}
                  aria-pressed={selected}
                  className={`rounded-2xl border-2 p-4 text-center transition disabled:cursor-not-allowed disabled:opacity-60 sm:p-6 ${
                    selected
                      ? "border-[#426A70] bg-[#EDF4F2]"
                      : "border-[#E3E9E7] bg-white hover:border-[#9BB5B7]"
                  }`}
                >
                  <span className="block text-4xl" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span className="mt-3 block text-sm font-bold text-[#24333D] sm:text-lg">
                    {option.label}
                  </span>
                  {selected && (
                    <span className="mt-2 block text-xs font-semibold text-[#426A70]">
                      ✓ Pasirinkta
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {saleType === "vehicle" ? (
          <VehicleListingForm key={category} initialCategory={category === "motorcycle" ? "motorcycle" : "car"} />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl bg-white p-6 shadow-lg sm:p-8"
          >
            {/* DETALĖS INFORMACIJA */}

            <div>
              <h2 className="text-xl font-bold text-[#24333D]">
                Detalės informacija
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Vienas skelbimas – viena detalė arba
                vienas komplektas.
              </p>
            </div>

            <label className="block font-semibold text-[#24333D]">
              Prekės tipas *
              <select
                value={partType}
                onChange={(event) =>
                  setPartType(event.target.value as PartType)
                }
                className={inputStyle}
                disabled={loading}
              >
                <option value="part">Atskira detalė</option>
                <option value="set">Dalių komplektas</option>
              </select>
            </label>

            {/* DETALIŲ KATALOGAS */}

            <div>
              <PartCatalogPicker
                value={title}
                selectedId={partCatalogId}
                category={category}
                onChange={(name, id) => {
                  setTitle(name);
                  setPartCatalogId(id);
                }}
              />

              <p className="mt-2 text-xs text-slate-500">
                Gali rašyti ir žargonu, pvz.,
                „fara“, „lempa“ arba „far“.
                Pasirink standartinį pavadinimą
                iš pasiūlymų.
              </p>

              {!partCatalogId && title.trim() && (
                <p className="mt-2 text-xs text-amber-700">
                  Standartinis pavadinimas dar
                  nepasirinktas. Jei tinkamo
                  varianto nėra, galima naudoti
                  savo pavadinimą.
                </p>
              )}
            </div>

            <label className="block font-semibold text-[#24333D]">
              Aprašymas
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
                className={inputStyle}
                placeholder="Papildoma informacija apie detalę..."
                disabled={loading}
              />
            </label>

            <label className="block font-semibold text-[#24333D]">
              Kaina (€) *
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(event) =>
                  setPrice(event.target.value)
                }
                className={inputStyle}
                disabled={loading}
              />
            </label>

            {/* TRANSPORTO PRIEMONĖS DUOMENYS */}

            <div className="border-t border-slate-200 pt-6">
              <h2 className="mb-4 text-xl font-bold text-[#24333D]">
                Transporto priemonės duomenys
              </h2>

              {donorVehicle && (
                <p className="mb-4 rounded-xl bg-[#EDF4F2] p-3 text-sm text-[#426A70]">
                  ✓ Duomenys perkelti iš automobilio donoro.
                  Jei reikia, gali juos patikslinti
                  konkrečiai detalei.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block font-semibold text-[#24333D]">
                  Dalies kategorija
                  <select
                    value={category}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      setPartCatalogId(null);
                    }}
                    className={inputStyle}
                    disabled={loading || Boolean(donorVehicle)}
                  >
                    <option value="car">
                      Automobilio dalis
                    </option>
                    <option value="motorcycle">
                      Motociklo dalis
                    </option>
                  </select>
                </label>

                <label className="block font-semibold text-[#24333D]">
                  Būklė
                  <select
                    value={condition}
                    onChange={(event) =>
                      setCondition(event.target.value)
                    }
                    className={inputStyle}
                    disabled={loading}
                  >
                    <option value="used">Naudota</option>
                    <option value="new">Nauja</option>
                  </select>
                </label>

                <label className="block font-semibold text-[#24333D]">
                  Markė
                  <input
                    value={manufacturer}
                    onChange={(event) =>
                      setManufacturer(event.target.value)
                    }
                    className={inputStyle}
                    placeholder="Pvz., BMW"
                    disabled={loading}
                  />
                </label>

                <label className="block font-semibold text-[#24333D]">
                  Modelis
                  <input
                    value={model}
                    onChange={(event) =>
                      setModel(event.target.value)
                    }
                    className={inputStyle}
                    placeholder="Pvz., 3 serija"
                    disabled={loading}
                  />
                </label>

                <label className="block font-semibold text-[#24333D]">
                  Modelio karta
                  <input
                    value={vehicleGeneration}
                    onChange={(event) =>
                      setVehicleGeneration(event.target.value)
                    }
                    className={inputStyle}
                    placeholder="Pvz., E90"
                    disabled={loading}
                  />
                </label>

                <label className="block font-semibold text-[#24333D]">
                  Metai
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={year}
                    onChange={(event) =>
                      setYear(event.target.value)
                    }
                    className={inputStyle}
                    disabled={loading}
                  />
                </label>

                <label className="block font-semibold text-[#24333D]">
                  OEM detalės kodas
                  <input
                    value={oemNumber}
                    onChange={(event) =>
                      setOemNumber(event.target.value)
                    }
                    className={inputStyle}
                    placeholder="Originalus gamintojo kodas"
                    disabled={loading}
                  />
                </label>

                <label className="block font-semibold text-[#24333D]">
                  Rinkos versija
                  <select
                    value={marketRegion}
                    onChange={(event) =>
                      setMarketRegion(event.target.value)
                    }
                    className={inputStyle}
                    disabled={loading}
                  >
                    <option value="">Nenurodyta</option>
                    <option value="EU">Europinė (EU)</option>
                    <option value="UK">Angliška (UK)</option>
                    <option value="US">Amerikietiška (US)</option>
                    <option value="OTHER">Kita</option>
                  </select>
                </label>

                <label className="block font-semibold text-[#24333D]">
                  Vairo pusė
                  <select
                    value={steeringSide}
                    onChange={(event) =>
                      setSteeringSide(event.target.value)
                    }
                    className={inputStyle}
                    disabled={loading}
                  >
                    <option value="">Nenurodyta</option>
                    <option value="LHD">Kairėje (LHD)</option>
                    <option value="RHD">Dešinėje (RHD)</option>
                  </select>
                </label>
              </div>
            </div>

            {/* SANDĖLIO INFORMACIJA */}

            <div className="border-t border-slate-200 pt-6">
              <h2 className="mb-4 text-xl font-bold text-[#24333D]">
                Sandėlio informacija
              </h2>

              <label
                htmlFor="warehouse-location-search"
                className="block font-semibold text-[#24333D]"
              >
                Sandėlio vieta
              </label>

              <div className="relative mt-2">
                <div className="flex gap-2">
                  <input
                    id="warehouse-location-search"
                    type="text"
                    autoComplete="off"
                    value={locationQuery}
                    onChange={(event) =>
                      handleLocationQueryChange(
                        event.target.value
                      )
                    }
                    onFocus={() =>
                      setLocationSearchOpen(true)
                    }
                    onBlur={() => {
                      window.setTimeout(() => {
                        setLocationSearchOpen(false);
                      }, 150);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setLocationSearchOpen(false);
                      }

                      if (
                        event.key === "Enter" &&
                        locationSearchOpen &&
                        !selectedLocationId &&
                        filteredLocations.length === 1
                      ) {
                        event.preventDefault();
                        selectLocation(filteredLocations[0]);
                      }
                    }}
                    placeholder={
                      locationsLoading
                        ? "Kraunamos vietos..."
                        : "Rašyk kodą, pvz., A-03..."
                    }
                    disabled={locationsLoading || loading}
                    className="w-full rounded-xl border border-[#D9E2E0] bg-white p-3 text-[#24333D] outline-none focus:border-[#426A70] focus:ring-2 focus:ring-[#426A70]/15 disabled:opacity-50"
                  />

                  {(locationQuery || selectedLocationId) && (
                    <button
                      type="button"
                      onClick={clearLocation}
                      disabled={loading}
                      className="rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
                      aria-label="Išvalyti sandėlio vietą"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {locationSearchOpen &&
                  !locationsLoading &&
                  !locationsError && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#D9E2E0] bg-white p-1 shadow-xl">
                      {filteredLocations.length > 0 ? (
                        filteredLocations.map((location) => (
                          <button
                            key={location.id}
                            type="button"
                            onMouseDown={(event) =>
                              event.preventDefault()
                            }
                            onClick={() =>
                              selectLocation(location)
                            }
                            className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-[#EDF4F2]"
                          >
                            <span className="font-bold text-[#24333D]">
                              {location.code}
                            </span>

                            {location.description && (
                              <span className="text-xs text-slate-500">
                                {location.description}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-3 text-sm text-slate-500">
                          Pagal įvestą tekstą vietų nerasta.
                        </p>
                      )}
                    </div>
                  )}
              </div>

              {selectedLocationId && (
                <p className="mt-2 text-sm font-semibold text-green-700">
                  ✓ Sandėlio vieta pasirinkta
                </p>
              )}

              {!selectedLocationId &&
                locationQuery.trim() && (
                  <p className="mt-2 text-xs text-amber-700">
                    Pasirink vietą iš pasiūlymų arba
                    sukurk naują.
                  </p>
                )}

              {locationsError && (
                <p className="mt-2 text-sm text-red-700">
                  {locationsError}
                </p>
              )}

              {!locationsLoading &&
                !locationsError &&
                locations.length === 0 && (
                  <p className="mt-2 text-sm text-slate-600">
                    Sandėlio vietų dar nėra.
                    Gali sukurti pirmąją žemiau.
                  </p>
                )}

              <button
                type="button"
                disabled={loading || savingLocation}
                onClick={() => {
                  if (showAddLocation) {
                    closeAddLocation();
                  } else {
                    openAddLocation();
                  }
                }}
                className="mt-3 text-sm font-bold text-[#426A70] underline underline-offset-4 hover:text-[#35565B] disabled:opacity-50"
              >
                {showAddLocation
                  ? "− Uždaryti naujos vietos formą"
                  : "+ Pridėti naują sandėlio vietą"}
              </button>

              {/* NAUJOS VIETOS FORMA */}
              {/* Naudojame div, NE form, kad nebūtų
                  įdėtos HTML formos viena į kitą. */}

              {showAddLocation && (
                <div className="mt-3 rounded-xl border border-[#D9E2E0] bg-[#F7FAF9] p-4">
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-[#24333D]">
                      Naujos vietos kodas *
                      <input
                        type="text"
                        maxLength={50}
                        value={newLocationCode}
                        onChange={(event) =>
                          setNewLocationCode(
                            event.target.value.toUpperCase()
                          )
                        }
                        className={inputStyle}
                        placeholder="Pvz., A-03-02-05"
                        disabled={savingLocation || loading}
                      />
                    </label>

                    <label className="block text-sm font-semibold text-[#24333D]">
                      Aprašymas (nebūtina)
                      <input
                        type="text"
                        maxLength={500}
                        value={newLocationDescription}
                        onChange={(event) =>
                          setNewLocationDescription(
                            event.target.value
                          )
                        }
                        className={inputStyle}
                        placeholder="Pvz., 3 stelažas, 2 lentyna"
                        disabled={savingLocation || loading}
                      />
                    </label>

                    {locationMessage && (
                      <p
                        role="alert"
                        className="rounded-lg bg-orange-50 p-2 text-sm text-red-700"
                      >
                        {locationMessage}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void handleCreateLocation();
                        }}
                        disabled={savingLocation || loading}
                        className="rounded-lg bg-[#426A70] px-4 py-2 text-sm font-bold text-white hover:bg-[#35565B] disabled:opacity-50"
                      >
                        {savingLocation
                          ? "Saugoma..."
                          : "✓ Sukurti ir pasirinkti"}
                      </button>

                      <button
                        type="button"
                        onClick={closeAddLocation}
                        disabled={savingLocation}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white"
                      >
                        Atšaukti
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-slate-500">
                Jei detalė dar nepadėta į sandėlį,
                vietą gali palikti nepasirinktą.
              </p>

              <label className="mt-5 block font-semibold text-[#24333D]">
                Pažeidimai ir defektai
                <textarea
                  value={damageNotes}
                  onChange={(event) =>
                    setDamageNotes(event.target.value)
                  }
                  rows={3}
                  className={inputStyle}
                  placeholder="Pvz., įbrėžimas, nulūžęs laikiklis. Jei pažeidimų nėra, palik tuščią."
                  disabled={loading}
                />
              </label>
            </div>

            {/* NUOTRAUKOS */}

            <div className="rounded-xl border-2 border-dashed border-[#9BB5B7] bg-[#F5F7F6] p-5">
              <h2 className="mb-3 text-lg font-bold text-[#24333D]">
                Detalės nuotraukos
              </h2>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={
                  loading || images.length >= MAX_IMAGES
                }
                onChange={handleImages}
                className="sr-only"
                aria-label="Pasirinkti skelbimo nuotraukas"
              />

              <button
                type="button"
                disabled={
                  loading || images.length >= MAX_IMAGES
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#426A70] px-5 py-5 text-lg font-bold text-white transition hover:bg-[#35565B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-2xl" aria-hidden="true">
                  +
                </span>
                Pridėti nuotraukas
              </button>

              <p className="mt-3 text-center text-sm text-slate-600">
                Iki 6 nuotraukų. JPG, PNG arba WEBP.
                Originalai iki 10 MB.
              </p>

              <p className="mt-1 text-center text-xs text-slate-500">
                Nuotraukos automatiškai sumažinamos
                prieš įkeliant.
              </p>

              {images.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 font-semibold text-[#24333D]">
                    Pasirinkta nuotraukų:{" "}
                    {images.length} iš {MAX_IMAGES}
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        {previews[index] ? (
                          <img
                            src={previews[index]}
                            alt={`Pasirinkta nuotrauka ${
                              index + 1
                            }`}
                            className="h-28 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-28 items-center justify-center text-sm text-slate-500">
                            Ruošiama...
                          </div>
                        )}

                        <div className="p-2">
                          <p
                            className="truncate text-xs text-slate-600"
                            title={file.name}
                          >
                            {file.name}
                          </p>

                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              removeImage(index)
                            }
                            className="mt-2 w-full rounded-lg border border-red-200 px-2 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Pašalinti
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PRANEŠIMAI */}

            {progress && (
              <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                {progress}
              </p>
            )}

            {message && (
              <p
                role="alert"
                className="rounded-lg bg-orange-50 p-3 text-sm text-slate-800"
              >
                {message}
              </p>
            )}

            {/* SKELBIMO PASKELBIMAS */}

            <button
              type="submit"
              disabled={
                loading ||
                locationsLoading ||
                savingLocation ||
                donorLoading ||
                Boolean(donorError)
              }
              className="w-full rounded-xl bg-[#426A70] p-4 font-bold text-white transition hover:bg-[#35565B] disabled:opacity-50"
            >
              {loading
                ? "Saugoma..."
                : donorLoading
                  ? "Kraunami donoro duomenys..."
                  : "Paskelbti detalę"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}



