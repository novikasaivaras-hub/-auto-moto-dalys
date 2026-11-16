
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
/* AUTO_MOTO_VEHICLE_TYPE_SYNC_V1 */
export default function VehicleListingForm({
  initialCategory = "car",
}: {
  initialCategory?: Category;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category] = useState<Category>(initialCategory);
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
  const [doorCount, setDoorCount] = useState("");
  const [motorcycleType, setMotorcycleType] = useState("");
  const [city, setCity] = useState("");
  const [driveType, setDriveType] = useState("");
  const [color, setColor] = useState("");
  const [inspectionUntil, setInspectionUntil] = useState("");
  const [vin, setVin] = useState("");
  const vinAutoValuesRef = useRef<Record<string, string>>({});
  const vinRequestRef = useRef(0);

  const [vinLoading, setVinLoading] = useState(false);
  const [vinMessage, setVinMessage] = useState("");
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
  // AUTO_MOTO_FORM_PROGRESS_V1
  const requiredFields = [
    manufacturer.trim(),
    model.trim(),
    year.trim(),
    price.trim(),
    city.trim(),
  ];


  // AUTO_MOTO_REQUIRED_FIELDS_V1
  const requiredFieldStatus = [
    { label: "Markė", filled: manufacturer.trim().length > 0 },
    { label: "Modelis", filled: model.trim().length > 0 },
    { label: "Pagaminimo metai", filled: year.trim().length > 0 },
    { label: "Kaina", filled: price.trim().length > 0 },
    { label: "Miestas", filled: city.trim().length > 0 },
  ];
  const completedFields = requiredFields.filter(Boolean).length;
  const completionPercent = Math.round(
    (completedFields / requiredFields.length) * 100
  );


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

  function clearPreviousVinData() {
    const previous = vinAutoValuesRef.current;

    const clearIfAuto = (
      key: string,
      setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
      const oldValue = previous[key];
      if (!oldValue) return;

      setter((current: string) =>
        current === oldValue ? "" : current
      );
    };

    clearIfAuto("manufacturer", setManufacturer);
    clearIfAuto("model", setModel);
    clearIfAuto("year", setYear);
    clearIfAuto("engineCapacity", setEngineCapacity);
    clearIfAuto("enginePower", setEnginePower);
    clearIfAuto("fuelType", setFuelType);
    clearIfAuto("transmission", setTransmission);
    clearIfAuto("bodyType", setBodyType);
    clearIfAuto("driveType", setDriveType);
    clearIfAuto("doorCount", setDoorCount);

    vinAutoValuesRef.current = {};
  }
  async function handleVinLookup() {
    const cleanVin = vin.trim().toUpperCase();

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin)) {
      setVinMessage("VIN turi sudaryti 17 simbolių (be I, O ir Q).");
      return;
    }

    const requestId = ++vinRequestRef.current;
    setVinLoading(true);
    setVinMessage("");

    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(cleanVin)}?format=json`
      );

      if (!response.ok) {
        throw new Error("VIN paslauga šiuo metu nepasiekiama.");
      }

      const payload = await response.json();
      const result = payload?.Results?.[0];
      if (requestId !== vinRequestRef.current) return;

      if (!result) {
        throw new Error("VIN duomenų nepavyko gauti.");
      }

      const read = (key: string) =>
        String(result[key] ?? "").trim();

      const normalize = (value: string) =>
        value.toLowerCase().replace(/\s+/g, " ").trim();

      const make = read("Make");
      const vehicleModel = read("Model");
      const modelYear = read("ModelYear");

      let filled = 0;

      if (make) {
        setManufacturer(make);
        vinAutoValuesRef.current["manufacturer"] = make;
        filled++;
      }

      if (vehicleModel) {
        setModel(vehicleModel);
        vinAutoValuesRef.current["model"] = vehicleModel;
        filled++;
      }

      if (/^\d{4}$/.test(modelYear)) {
        setYear(modelYear);
        vinAutoValuesRef.current["year"] = modelYear;
        filled++;
      }

      const displacement = Number(read("DisplacementCC"));

      if (displacement > 0 && Number.isFinite(displacement)) {
        setEngineCapacity(String(Math.round(displacement)));
        vinAutoValuesRef.current["engineCapacity"] = String(Math.round(displacement));
        filled++;
      }

      let power = Number(read("EngineKW"));

      if (!(power > 0)) {
        const hp = Number(read("EngineHP"));
        if (hp > 0) power = hp * 0.745699872;
      }

      if (power > 0 && Number.isFinite(power)) {
        setEnginePower(String(Math.round(power)));
        vinAutoValuesRef.current["enginePower"] = String(Math.round(power));
        filled++;
      }

      const fuel = normalize(read("FuelTypePrimary"));
      const secondaryFuel = normalize(read("FuelTypeSecondary"));
      const electrification = normalize(read("ElectrificationLevel"));

      let mappedFuel = "";

      if (
        electrification.includes("plug-in") ||
        electrification.includes("phev")
      ) {
        mappedFuel = "Įkraunamas hibridas";
      } else if (
        electrification.includes("hybrid") ||
        electrification.includes("hev")
      ) {
        mappedFuel = "Hibridas";
      } else if (
        fuel.includes("electric") ||
        electrification.includes("battery electric")
      ) {
        mappedFuel = "Elektra";
      } else if (
        (fuel.includes("gasoline") && secondaryFuel.includes("lpg")) ||
        (fuel.includes("lpg") && secondaryFuel.includes("gasoline"))
      ) {
        mappedFuel = "Benzinas / dujos";
      } else if (fuel.includes("diesel")) {
        mappedFuel = "Dyzelinas";
      } else if (fuel.includes("gasoline")) {
        mappedFuel = "Benzinas";
      }

      if (mappedFuel) {
        setFuelType(mappedFuel);
        vinAutoValuesRef.current["fuelType"] = mappedFuel;
        filled++;
      }

      const transmissionValue = normalize(read("TransmissionStyle"));

      if (transmissionValue.includes("automatic")) {
        setTransmission("Automatinė");
        vinAutoValuesRef.current["transmission"] = "Automatinė";
        filled++;
      } else if (transmissionValue.includes("manual")) {
        setTransmission("Mechaninė");
        vinAutoValuesRef.current["transmission"] = "Mechaninė";
        filled++;
      }

      const body = normalize(read("BodyClass"));

      let mappedBody = "";

      if (body.includes("sport utility") || body.includes("suv")) {
        mappedBody = "Visureigis";
      } else if (body.includes("hatchback")) {
        mappedBody = "Hečbekas";
      } else if (body.includes("wagon")) {
        mappedBody = "Universalas";
      } else if (body.includes("sedan")) {
        mappedBody = "Sedanas";
      } else if (body.includes("coupe")) {
        mappedBody = "Kupė";
      } else if (body.includes("convertible") || body.includes("cabriolet")) {
        mappedBody = "Kabrioletas";
      } else if (body.includes("minivan") || body.includes("van")) {
        mappedBody = "Vienatūris";
      }

      if (category === "car" && mappedBody) {
        setBodyType(mappedBody);
        vinAutoValuesRef.current["bodyType"] = mappedBody;
        filled++;
      }

      const drive = normalize(read("DriveType"));

      let mappedDrive = "";

      if (
        drive.includes("all-wheel") ||
        drive.includes("four-wheel") ||
        drive.includes("4wd") ||
        drive.includes("awd") ||
        drive.includes("4x4")
      ) {
        mappedDrive = "Visi (4x4)";
      } else if (
        drive.includes("front-wheel") ||
        drive.includes("fwd")
      ) {
        mappedDrive = "Priekiniai";
      } else if (
        drive.includes("rear-wheel") ||
        drive.includes("rwd")
      ) {
        mappedDrive = "Galiniai";
      }

      if (category === "car" && mappedDrive) {
        setDriveType(mappedDrive);
        vinAutoValuesRef.current["driveType"] = mappedDrive;
        filled++;
      }

      const doors = read("Doors");

      if (
        category === "car" &&
        ["2", "3", "4", "5", "6", "7"].includes(doors)
      ) {
        setDoorCount(doors);
        vinAutoValuesRef.current["doorCount"] = doors;
        filled++;
      }
      setVin(cleanVin);

      setVinMessage(
        filled > 0
          ? `VIN patikrintas. Automatiškai užpildyti ${filled} laukai. Patikrink duomenis ir papildyk trūkstamus.`
          : "VIN patikrintas, tačiau šiam automobiliui automatiniai duomenys nerasti. Užpildyk rankiniu būdu."
      );
    } catch (error) {
      setVinMessage(
        error instanceof Error
          ? error.message
          : "Nepavyko patikrinti VIN."
      );
    } finally {
      setVinLoading(false);
    }
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
      if (!city.trim()) {
        throw new Error("Nurodyk miestą, kuriame yra transporto priemonė.");
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
              category === "car" && bodyType && `Kėbulas: ${bodyType}`,
              category === "car" && doorCount && `Durų skaičius: ${doorCount}`,
              category === "motorcycle" && motorcycleType && `Motociklo tipas: ${motorcycleType}`,
              `Miestas: ${city.trim()}`,
              category === "car" && driveType && `Varantieji ratai: ${driveType}`,
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
      <div className="rounded-2xl border border-[#D9E2E0] bg-[#F5F9F8] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#24333D]">
            Skelbimo užpildymas
          </p>
          <p className="text-sm font-semibold text-[#426A70]">
            {completedFields} iš {requiredFields.length}
          </p>
        </div>

        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-[#D9E2E0]"
          role="progressbar"
          aria-label="Privalomų laukų užpildymas"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionPercent}
        >
          <div
            className="h-full rounded-full bg-[#426A70] transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {requiredFieldStatus.map((field) => (
            <span
              key={field.label}
              className={
                field.filled
                  ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800"
                  : "rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
              }
            >
              {field.filled ? "✓ " : "○ "}
              {field.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">
          {completedFields === requiredFields.length
            ? "Visi pagrindiniai laukai užpildyti."
            : `Liko užpildyti ${requiredFields.length - completedFields} privalomus laukus.`}
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold text-[#24333D]">
          Transporto priemonės informacija
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Įvesk automobilio arba motociklo duomenis.
        </p>
      </div>

      <div className="rounded-2xl border border-[#D9E2E0] bg-[#F5F9F8] p-4">
        <label className="block font-semibold text-[#24333D]">
          VIN kodas – automatinis duomenų užpildymas
          <input
            type="text"
            value={vin}
            onChange={(event) => {
              vinRequestRef.current++;
              clearPreviousVinData();
              setVin(event.target.value.toUpperCase());
              setVinMessage("");
            }}
            maxLength={17}
            disabled={loading || vinLoading}
            className={inputStyle}
            placeholder="Įvesk 17 simbolių VIN"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          onClick={handleVinLookup}
          disabled={loading || vinLoading || vin.trim().length !== 17}
          className="mt-3 rounded-xl bg-[#426A70] px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {vinLoading ? "Tikrinamas VIN..." : "Patikrinti VIN"}
        </button>
        {vinMessage && (
          <p className="mt-3 text-sm text-[#24333D]" role="status">
            {vinMessage}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Duomenys gaunami iš NHTSA vPIC. Europos automobilių informacija gali būti nepilna.
        </p>
      </div>
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

      <label className="block font-semibold text-[#24333D]">
        Miestas, kuriame yra transporto priemonė *
        <input
          type="text"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          required
          disabled={loading}
          className={inputStyle}
          placeholder="Pvz., Vilnius"
          maxLength={100}
        />
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
            
            { label: "Techninė apžiūra iki", value: inspectionUntil, setter: setInspectionUntil, type: "month" },

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
              label: "Spalva",
              value: color,
              setter: setColor,
              options: ["Juoda", "Balta", "Pilka", "Sidabrinė", "Mėlyna", "Raudona", "Žalia", "Ruda", "Smėlio", "Geltona", "Oranžinė", "Violetinė", "Auksinė", "Kita"],
            },
            {              label: "Kuro tipas",
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
            ...(category === "car" ? [
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
              {
                label: "Durų skaičius",
                value: doorCount,
                setter: setDoorCount,
                options: ["2", "3", "4", "5", "6", "7", "2/3", "4/5", "6/7", "Kita"],
              },
            ] : [
              {
                label: "Motociklo tipas",
                value: motorcycleType,
                setter: setMotorcycleType,
                options: ["Sportinis", "Turistinis", "Čioperis / kruizeris", "Enduro", "Krosinis", "Naked", "Motoroleris", "Klasikinis", "Kita"],
              },
            ]),
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

      {/* AUTO_MOTO_MOBILE_SUBMIT_V1 */}
      <div className="sticky bottom-0 z-20 -mx-6 border-t border-[#D9E2E0] bg-white/95 px-6 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
        <button
          type="submit"
          disabled={loading || completedFields < requiredFields.length}
          className="w-full min-h-12 rounded-xl bg-[#426A70] px-4 py-3 font-bold text-white transition-colors hover:bg-[#35575C] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Saugoma..."
            : completedFields < requiredFields.length
              ? `Užpildyk privalomus laukus (${completedFields}/${requiredFields.length})`
              : "Paskelbti transporto priemonę"}
        </button>

        {completedFields < requiredFields.length && !loading && (
          <p className="mt-2 text-center text-xs text-slate-500">
            Užpildyk visus privalomus laukus, kad galėtum paskelbti skelbimą.
          </p>
        )}
      </div>
    </form>
  );
}




