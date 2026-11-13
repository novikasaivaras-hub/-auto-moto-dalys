
"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import VehicleMakeModelPicker from "@/components/VehicleMakeModelPicker";

type Category = "car" | "motorcycle";

const MAX_IMAGES = 20;
const MAX_SIZE = 10 * 1024 * 1024;

const inputStyle =
  "mt-2 w-full rounded-xl border border-[#D9E2E0] bg-white p-3 text-[#24333D] outline-none focus:border-[#426A70]";

function VehiclePhotoGallery({
  images,
  loading,
  onChange,
}: {
  images: File[];
  loading: boolean;
  onChange: (files: File[]) => void;
}) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [selected] = next.splice(from, 1);
    next.splice(to, 0, selected);
    onChange(next);
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          {previews[index] && (
            <img
              src={previews[index]}
              alt={`Nuotrauka ${index + 1}`}
              className="h-44 w-full object-cover"
            />
          )}

          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-slate-500">
                {file.name}
              </span>
              {index === 0 && (
                <span className="rounded-full bg-[#E6F0EE] px-2 py-1 text-xs font-bold text-[#426A70]">
                  Pagrindinė
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {index > 0 && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => moveImage(index, 0)}
                  className="rounded-lg bg-[#426A70] px-3 py-2 text-xs font-semibold text-white"
                >
                  Padaryti pagrindine
                </button>
              )}

              <button
                type="button"
                disabled={loading || index === 0}
                onClick={() => moveImage(index, index - 1)}
                className="rounded-lg border px-3 py-2 text-xs"
              >
                ←
              </button>

              <button
                type="button"
                disabled={loading || index === images.length - 1}
                onClick={() => moveImage(index, index + 1)}
                className="rounded-lg border px-3 py-2 text-xs"
              >
                →
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  onChange(images.filter((_, imageIndex) => imageIndex !== index))
                }
                className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700"
              >
                Pašalinti
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
export default function VehicleListingForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<Category>("car");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("used");
  const [description, setDescription] = useState("");

  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [engineCapacity, setEngineCapacity] = useState("");
  const [enginePower, setEnginePower] = useState("");
  const [transmission, setTransmission] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [driveType, setDriveType] = useState("");
  const [color, setColor] = useState("");
  const [inspectionUntil, setInspectionUntil] = useState("");
  const [vin, setVin] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);

  const equipmentGroups = [
    {
      name: "Komfortas ir salonas",
      items: [
        "Šildomos priekinės sėdynės", "Šildomos galinės sėdynės",
        "Ventiliuojamos sėdynės", "Masažuojamos sėdynės",
        "Elektra reguliuojamos sėdynės", "Sėdynių atmintis",
        "Šildomas vairas", "Klimato kontrolė", "Dviejų zonų klimato kontrolė",
        "Trijų zonų klimato kontrolė", "Keturių zonų klimato kontrolė",
        "Odinis salonas", "Alcantara salonas", "Sportinės sėdynės",
        "Panoraminis stogas", "Stoglangis", "Projekcinis ekranas (HUD)",
        "Elektra valdomas bagažinės dangtis", "Beraktis užvedimas",
        "Beraktis atrakinimas", "Ambient salono apšvietimas",
        "Šildomas priekinis stiklas", "Elektra valdomos užuolaidėlės",
        "Ventiliuojamas vairas", "Šaldomas daiktadėžės skyrius"
      ],
    },
    {
      name: "Vairavimo pagalba ir saugumas",
      items: [
        "Greičio palaikymo sistema", "Adaptyvioji greičio palaikymo sistema",
        "Juostos palaikymo asistentas", "Juostos keitimo asistentas",
        "Aklosios zonos stebėjimas", "Automatinis avarinis stabdymas",
        "Priekiniai parkavimo jutikliai", "Galiniai parkavimo jutikliai",
        "Galinio vaizdo kamera", "360° kameros", "Automatinis parkavimas",
        "Nuotolinis parkavimas", "Naktinio matymo sistema",
        "Kelio ženklų atpažinimas", "Vairuotojo dėmesio stebėjimas",
        "ISOFIX", "Galinio skersinio eismo perspėjimas",
        "Susidūrimo prevencijos sistema", "Adaptyvus greičio ribotuvas",
        "Automatinis pagalbos iškvietimas (eCall)",
        "Vairavimo spūstyse asistentas", "Automatinis juostos keitimas",
        "Priekinio skersinio eismo perspėjimas"
      ],
    },
    {
      name: "Multimedija ir ryšys",
      items: [
        "Navigacija", "Apple CarPlay", "Android Auto",
        "Belaidis Apple CarPlay", "Belaidis Android Auto",
        "Bluetooth", "USB-C jungtys", "Belaidis telefono įkrovimas",
        "Skaitmeninis prietaisų skydelis", "Jutiklinis ekranas",
        "Premium garso sistema", "Bose garso sistema",
        "Harman Kardon garso sistema", "Bang & Olufsen garso sistema",
        "Burmester garso sistema", "Galiniai pramogų ekranai",
        "Valdymas balsu", "OTA programinės įrangos atnaujinimai",
        "Integruotas internetas", "Wi-Fi prieigos taškas",
        "Papildomas keleivio ekranas", "Papildytos realybės navigacija"
      ],
    },
    {
      name: "Žibintai ir eksterjeras",
      items: [
        "LED žibintai", "Matrix LED žibintai", "Lazeriniai žibintai",
        "Adaptyvieji žibintai", "Automatinės tolimosios šviesos",
        "LED dienos žibintai", "LED galiniai žibintai",
        "Elektra sulankstomi veidrodėliai", "Šildomi veidrodėliai",
        "Lengvojo lydinio ratlankiai", "Tamsinti stiklai",
        "Stogo bėgeliai", "Elektra valdomas kablys",
        "Nuimamas kablys", "Sportinis apdailos paketas",
        "Bekontaktis bagažinės atidarymas", "Elektra valdomos durys",
        "Automatiniai valytuvai", "Lietaus jutiklis"
      ],
    },
    {
      name: "Važiuoklė ir dinamika",
      items: [
        "Visų varančiųjų ratų pavara (AWD)", "Pneumatinė pakaba",
        "Adaptyvūs amortizatoriai", "Galiniai vairuojamieji ratai",
        "Važiavimo režimai", "Sportinė pakaba",
        "Riboto praslydimo diferencialas",
        "Nusileidimo nuo kalno asistentas",
        "Pakilimo į kalną asistentas", "Reguliuojamas prošvaisos aukštis",
        "Aktyvūs stabilizatoriai", "Sportinė išmetimo sistema",
        "Pavarų perjungimas prie vairo"
      ],
    },
    {
      name: "Elektromobiliai ir hibridai",
      items: [
        "Šilumos siurblys", "Baterijos pašildymas",
        "Baterijos paruošimas greitajam įkrovimui",
        "V2L elektros tiekimas įrenginiams", "V2H / V2G palaikymas",
        "AC įkrovimas 22 kW", "DC greitasis įkrovimas",
        "Regeneracinio stabdymo reguliavimas",
        "Vieno pedalo vairavimas", "Įkrovimo planavimas",
        "Įkrovimo kabelis", "Nuotolinis baterijos būklės stebėjimas",
        "Saulės energijos stogas", "Išorinė elektros jungtis"
      ],
    },
    {
      name: "Kita įranga",
      items: [
        "Integruotas vaizdo registratorius",
        "Skaitmeninis automobilio raktas", "Telefonas kaip raktas",
        "Nuotolinis salono pašildymas", "Nuotolinis kondicionavimas",
        "Salono oro valytuvas", "Jonizatorius",
        "Elektrinės stumdomos durys", "Apsaugos signalizacija",
        "Imobilizatorius", "GPS sekimo sistema",
        "Atsarginis ratas", "Remonto komplektas",
        "Gamyklinė papildoma apsauga"
      ],
    },
  ];

  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [expandedEquipment, setExpandedEquipment] = useState<string[]>([]);
  const [customEquipment, setCustomEquipment] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState("");

  function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (images.length + selected.length > MAX_IMAGES) {
      setMessage("Galima pridėti daugiausia 20 nuotraukų.");
      return;
    }

    for (const file of selected) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      ) {
        setMessage("Leidžiami JPG, PNG ir WEBP formatai.");
        return;
      }

      if (file.size > MAX_SIZE) {
        setMessage("Viena nuotrauka negali viršyti 10 MB.");
        return;
      }
    }

    setImages((current) => [...current, ...selected]);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

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
        throw new Error("Norėdamas įdėti skelbimą, prisijunk.");
      }

      if (!manufacturer.trim() || !model.trim()) {
        throw new Error("Nurodyk markę ir modelį.");
      }

      const parsedYear = Number(year);
      if (
        !Number.isInteger(parsedYear) ||
        parsedYear < 1900 ||
        parsedYear > 2100
      ) {
        throw new Error("Įrašyk teisingus pagaminimo metus.");
      }

      if (
        price.trim() === "" ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0
      ) {
        throw new Error("Įrašyk teisingą kainą.");
      }

      const cleanVin = vin.trim().toUpperCase();

      if (cleanVin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
        throw new Error("VIN turi sudaryti 17 raidžių ir skaitmenų (be I, O ir Q).");
      }
      setProgress("Kuriamas skelbimas...");

      const { data: listing, error: listingError } =
        await supabase
          .from("listings")
          .insert({
            seller_id: user.id,
            sale_type: "vehicle",
            category,
            title: `${manufacturer.trim()} ${model.trim()} ${year}`,
            manufacturer: manufacturer.trim(),
            model: model.trim(),
            year: parsedYear,
            price: Number(price),
            condition,
            description: [
              description.trim(),
              "",
              "TECHNINĖ INFORMACIJA",
              mileage && `Rida: ${mileage} km`,
              fuelType && `Kuro tipas: ${fuelType}`,
              engineCapacity && `Variklio tūris: ${engineCapacity} cm³`,
              enginePower && `Variklio galia: ${enginePower} kW`,
              transmission && `Pavarų dėžė: ${transmission}`,
              bodyType && `Kėbulas: ${bodyType}`,
              driveType && `Varantieji ratai: ${driveType}`,
              color && `Spalva: ${color}`,
              inspectionUntil && `TA iki: ${inspectionUntil}`,
              "",
              "YPATUMAI IR ĮRANGA",
              ...equipment.map((item) => `✓ ${item}`),
              "",
              damageNotes && `DEFEKTAI IR REMONTAI\n${damageNotes}`,
            ].filter(Boolean).join("\n") || null,
          })
          .select("id")
          .single();

      if (listingError || !listing) {
        throw new Error(
          listingError?.message || "Nepavyko sukurti skelbimo."
        );
      }

      listingCreated = true;

      if (cleanVin) {
        setProgress("Saugomas VIN kodas...");

        const { error: vinError } = await supabase
          .from("listing_vehicle_vins")
          .insert({
            listing_id: listing.id,
            vin: cleanVin,
          });

        if (vinError) {
          throw new Error(
            "Skelbimas sukurtas, bet VIN išsaugoti nepavyko: " +
              vinError.message
          );
        }
      }

      for (let index = 0; index < images.length; index++) {
        setProgress(
          `Įkeliama nuotrauka ${index + 1} iš ${images.length}...`
        );

        const compressed = await imageCompression(images[index], {
          maxSizeMB: 0.4,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: 0.85,
        });

        const imagePath =
          `${user.id}/${listing.id}/` +
          `${crypto.randomUUID()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(imagePath, compressed, {
            contentType: "image/webp",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { error: imageError } = await supabase
          .from("listing_images")
          .insert({
            listing_id: listing.id,
            image_path: imagePath,
            sort_order: index,
          });

        if (imageError) {
          throw new Error(imageError.message);
        }
      }

      router.push("/my-listings");
      router.refresh();
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : "Nežinoma klaida.";

      setMessage(
        listingCreated
          ? "Skelbimas sukurtas, bet nuotraukų įkėlimas nepavyko. " +
              errorText +
              " Nekurk skelbimo antrą kartą."
          : errorText
      );
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl bg-white p-6 shadow-lg sm:p-8"
    >
      <div>
        <h2 className="text-xl font-bold text-[#24333D]">
          Transporto priemonės informacija
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Įvesk automobilio arba motociklo duomenis.
        </p>
      </div>

      <label className="block font-semibold text-[#24333D]">
        Transporto priemonės tipas *
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as Category);
            setManufacturer("");
            setModel("");
          }}
          disabled={loading}
          className={inputStyle}
        >
          <option value="car">Automobilis</option>
          <option value="motorcycle">Motociklas</option>
        </select>
      </label>

      <VehicleMakeModelPicker
        category={category}
        manufacturer={manufacturer}
        model={model}
        onManufacturerChange={setManufacturer}
        onModelChange={setModel}
        disabled={loading}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block font-semibold text-[#24333D]">
          Pagaminimo metai *
          <input
            type="number"
            min="1900"
            max="2100"
            required
            value={year}
            onChange={(event) => setYear(event.target.value)}
            disabled={loading}
            className={inputStyle}
            placeholder="Pvz., 2018"
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
            onChange={(event) => setPrice(event.target.value)}
            disabled={loading}
            className={inputStyle}
            placeholder="Pvz., 5500"
          />
        </label>
      </div>

      <label className="block font-semibold text-[#24333D]">
        Būklė
        <select
          value={condition}
          onChange={(event) => setCondition(event.target.value)}
          disabled={loading}
          className={inputStyle}
        >
          <option value="used">Naudota</option>
          <option value="new">Nauja</option>
        </select>
      </label>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-xl font-bold text-[#24333D]">
          Techninė informacija
        </h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Rida (km)", value: mileage, setter: setMileage, type: "number" },
            { label: "Variklio tūris (cm³)", value: engineCapacity, setter: setEngineCapacity, type: "number" },
            { label: "Variklio galia (kW)", value: enginePower, setter: setEnginePower, type: "number" },
            { label: "Spalva", value: color, setter: setColor, type: "text" },
            { label: "Techninė apžiūra iki", value: inspectionUntil, setter: setInspectionUntil, type: "month" },
            { label: "VIN kodas", value: vin, setter: setVin, type: "text" },
          ].map((field) => (
            <label key={field.label} className="block font-semibold text-[#24333D]">
              {field.label}
              <input
                type={field.type}
                value={field.value}
                onChange={(event) => field.setter(event.target.value)}
                disabled={loading}
                className={inputStyle}
              />
            </label>
          ))}

          {[
            {
              label: "Kuro tipas",
              value: fuelType,
              setter: setFuelType,
              options: ["Benzinas", "Dyzelinas", "Benzinas / dujos", "Hibridas", "Įkraunamas hibridas", "Elektra", "Kita"],
            },
            {
              label: "Pavarų dėžė",
              value: transmission,
              setter: setTransmission,
              options: ["Mechaninė", "Automatinė"],
            },
            {
              label: "Kėbulo tipas",
              value: bodyType,
              setter: setBodyType,
              options: ["Sedanas", "Universalas", "Hečbekas", "Visureigis", "Vienatūris", "Kupė", "Kabrioletas", "Kita"],
            },
            {
              label: "Varantieji ratai",
              value: driveType,
              setter: setDriveType,
              options: ["Priekiniai", "Galiniai", "Visi (4x4)"],
            },
          ].map((field) => (
            <label key={field.label} className="block font-semibold text-[#24333D]">
              {field.label}
              <select
                value={field.value}
                onChange={(event) => field.setter(event.target.value)}
                disabled={loading}
                className={inputStyle}
              >
                <option value="">Nenurodyta</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {category === "car" && (
        <div className="border-t border-slate-200 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-[#24333D]">
                Papildoma įranga
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Pažymėk automobilio įrangą. Gali ieškoti ir pridėti savo variantą.
              </p>
            </div>
            <span className="rounded-full bg-[#E6F0EE] px-3 py-1 text-sm font-semibold text-[#426A70]">
              {equipment.length} pasirinkta
            </span>
          </div>

          <input
            type="search"
            value={equipmentSearch}
            onChange={(event) => setEquipmentSearch(event.target.value)}
            disabled={loading}
            placeholder="Ieškoti įrangos, pvz., Matrix LED, masažas..."
            className={inputStyle}
          />

          <div className="mt-4 space-y-3">
            {equipmentGroups.map((group) => {
              const filtered = group.items.filter((item) =>
                item.toLocaleLowerCase("lt").includes(
                  equipmentSearch.trim().toLocaleLowerCase("lt")
                )
              );
              const open =
                expandedEquipment.includes(group.name) ||
                equipmentSearch.trim().length > 0;
              const count = group.items.filter((item) =>
                equipment.includes(item)
              ).length;

              if (equipmentSearch.trim() && filtered.length === 0) {
                return null;
              }

              return (
                <div key={group.name} className="overflow-hidden rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedEquipment((current) =>
                        current.includes(group.name)
                          ? current.filter((name) => name !== group.name)
                          : [...current, group.name]
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 p-4 text-left font-semibold text-[#24333D]"
                  >
                    <span>{group.name}</span>
                    <span className="text-sm text-slate-500">
                      {count}/{group.items.length} {open ? "−" : "+"}
                    </span>
                  </button>

                  {open && (
                    <div className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-2">
                      {filtered.map((item) => (
                        <label key={item} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={equipment.includes(item)}
                            disabled={loading}
                            onChange={(event) =>
                              setEquipment((current) =>
                                event.target.checked
                                  ? [...current, item]
                                  : current.filter((value) => value !== item)
                              )
                            }
                          />
                          <span className="text-sm">{item}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl bg-[#F5F7F6] p-4">
            <label className="block font-semibold text-[#24333D]">
              Nerandi savo įrangos?
              <input
                type="text"
                value={customEquipment}
                onChange={(event) => setCustomEquipment(event.target.value)}
                disabled={loading}
                placeholder="Pvz., speciali gamyklinė sistema"
                className={inputStyle}
              />
            </label>
            <button
              type="button"
              disabled={loading || !customEquipment.trim()}
              onClick={() => {
                const item = customEquipment.trim();
                if (item && !equipment.includes(item)) {
                  setEquipment((current) => [...current, item]);
                }
                setCustomEquipment("");
              }}
              className="mt-3 rounded-lg bg-[#426A70] px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              + Pridėti įrangą
            </button>

            {equipment.filter(
              (item) => !equipmentGroups.some((group) => group.items.includes(item))
            ).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {equipment
                  .filter((item) => !equipmentGroups.some((group) => group.items.includes(item)))
                  .map((item) => (
                    <button
                      key={item}
                      type="button"
                      disabled={loading}
                      onClick={() =>
                        setEquipment((current) =>
                          current.filter((value) => value !== item)
                        )
                      }
                      className="rounded-full border border-[#426A70] px-3 py-1 text-sm text-[#426A70]"
                    >
                      {item} ×
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
      <label className="block font-semibold text-[#24333D]">
        Defektai ir atlikti remontai
        <textarea
          rows={4}
          value={damageNotes}
          onChange={(event) => setDamageNotes(event.target.value)}
          disabled={loading}
          className={inputStyle}
          placeholder="Aprašyk defektus, remontus ir aptarnavimo istoriją..."
        />
      </label>
      <label className="block font-semibold text-[#24333D]">
        Aprašymas
        <textarea
          rows={5}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={loading}
          className={inputStyle}
          placeholder="Rida, variklis, komplektacija, defektai..."
        />
      </label>

      <div className="rounded-xl border-2 border-dashed border-[#9BB5B7] bg-[#F5F7F6] p-5">
        <h3 className="mb-3 font-bold text-[#24333D]">
          Nuotraukos
        </h3>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleImages}
          disabled={loading || images.length >= MAX_IMAGES}
          className="sr-only"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || images.length >= MAX_IMAGES}
          className="w-full rounded-xl bg-[#426A70] p-4 font-bold text-white disabled:opacity-50"
        >
          + Pridėti nuotraukas
        </button>

        <p className="mt-2 text-center text-xs text-slate-500">
          Iki 20 nuotraukų, po 10 MB.
        </p>

        {images.length > 0 && (
          <VehiclePhotoGallery
            images={images}
            loading={loading}
            onChange={setImages}
          />
        )}
      </div>
      {progress && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm">
          {progress}
        </p>
      )}

      {message && (
        <p
          role="alert"
          className="rounded-lg bg-orange-50 p-3 text-sm text-red-700"
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#426A70] p-4 font-bold text-white disabled:opacity-50"
      >
        {loading ? "Saugoma..." : "Paskelbti transporto priemonę"}
      </button>
    </form>
  );
}
