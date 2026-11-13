
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";

const MAX_IMAGES = 6;
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type Listing = {
  id: string;
  seller_id: string;
  sale_type: "part" | "vehicle";
  title: string;
  description: string | null;
  price: number;
  category: string;
  condition: string;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  oem_number: string | null;
  warehouse_location: string | null;
  warehouse_location_id: string | null;
};

type WarehouseLocation = {
  id: string;
  code: string;
  description: string | null;
};

type Photo = {
  key: string;
  id?: string;
  image_path?: string;
  file?: File;
  url: string;
  rotation: number;
  positionX: number;
  positionY: number;
  zoom: number;
  changed: boolean;
};

function moveItem<T>(
  items: T[],
  from: number,
  to: number
): T[] {
  if (to < 0 || to >= items.length) {
    return items;
  }

  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);

  return result;
}

async function loadImage(
  source: string
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error("Nepavyko apdoroti nuotraukos.")
      );

    image.src = source;
  });
}

async function preparePhoto(
  photo: Photo
): Promise<File> {
  const source = photo.file
    ? URL.createObjectURL(photo.file)
    : photo.url;

  try {
    const image = await loadImage(source);

    const angle =
      ((photo.rotation % 360) + 360) % 360;

    const sideways =
      angle === 90 || angle === 270;

    const rotatedWidth = sideways
      ? image.naturalHeight
      : image.naturalWidth;

    const rotatedHeight = sideways
      ? image.naturalWidth
      : image.naturalHeight;

    const cropEnabled =
      photo.positionX !== 50 ||
      photo.positionY !== 50 ||
      photo.zoom !== 1;

    const outputWidth = cropEnabled
      ? 1200
      : rotatedWidth;

    const outputHeight = cropEnabled
      ? 900
      : rotatedHeight;

    const canvas =
      document.createElement("canvas");

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "Naršyklė negali apdoroti nuotraukos."
      );
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(
      0,
      0,
      outputWidth,
      outputHeight
    );

    const baseScale = cropEnabled
      ? Math.max(
          outputWidth / rotatedWidth,
          outputHeight / rotatedHeight
        )
      : 1;

    const scale = baseScale * photo.zoom;

    const drawnWidth =
      rotatedWidth * scale;

    const drawnHeight =
      rotatedHeight * scale;

    const offsetX =
      (outputWidth - drawnWidth) *
      (photo.positionX / 100);

    const offsetY =
      (outputHeight - drawnHeight) *
      (photo.positionY / 100);

    ctx.save();

    ctx.translate(
      offsetX + drawnWidth / 2,
      offsetY + drawnHeight / 2
    );

    ctx.rotate(
      (angle * Math.PI) / 180
    );

    ctx.scale(scale, scale);

    ctx.drawImage(
      image,
      -image.naturalWidth / 2,
      -image.naturalHeight / 2
    );

    ctx.restore();

    const blob = await new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error(
                  "Nepavyko išsaugoti nuotraukos."
                )
              );
            }
          },
          "image/webp",
          0.85
        );
      }
    );

    const result = new File(
      [blob],
      `${crypto.randomUUID()}.webp`,
      { type: "image/webp" }
    );

    return imageCompression(result, {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/webp",
    });
  } finally {
    if (photo.file) {
      URL.revokeObjectURL(source);
    }
  }
}

function EditListingContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const previewUrlsRef =
    useRef<string[]>([]);

  const warehouseContainerRef =
    useRef<HTMLDivElement>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [progress, setProgress] =
    useState("");

  const [listing, setListing] =
    useState<Listing | null>(null);

  const [photos, setPhotos] =
    useState<Photo[]>([]);

  const [removedPhotos, setRemovedPhotos] =
    useState<Photo[]>([]);

  const [
    warehouseLocations,
    setWarehouseLocations,
  ] = useState<WarehouseLocation[]>([]);

  const [
    warehouseSearch,
    setWarehouseSearch,
  ] = useState("");

  const [
    warehouseDropdownOpen,
    setWarehouseDropdownOpen,
  ] = useState(false);

  const [
    warehouseFilterActive,
    setWarehouseFilterActive,
  ] = useState(false);

  const [
    warehouseLoading,
    setWarehouseLoading,
  ] = useState(false);

  const [
    warehouseError,
    setWarehouseError,
  ] = useState("");

  const [
    showNewWarehouse,
    setShowNewWarehouse,
  ] = useState(false);

  const [
    newWarehouseCode,
    setNewWarehouseCode,
  ] = useState("");

  const [
    newWarehouseDescription,
    setNewWarehouseDescription,
  ] = useState("");

  const [
    creatingWarehouse,
    setCreatingWarehouse,
  ] = useState(false);

  const isVehicle =
    listing?.sale_type === "vehicle";

  const isMotorcycle =
    listing?.category === "motorcycle";

  const inputStyle =
    "mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-[#426A70]";

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(
        (url) => URL.revokeObjectURL(url)
      );
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        warehouseContainerRef.current &&
        !warehouseContainerRef.current.contains(
          event.target as Node
        )
      ) {
        setWarehouseDropdownOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      setLoading(true);
      setError("");
      setWarehouseError("");

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !authData.user) {
        setError(
          "Norėdamas redaguoti skelbimą, prisijunk."
        );
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      const {
        data,
        error: listingError,
      } = await supabase
        .from("listings")
        .select(
          "id, seller_id, sale_type, title, description, price, category, condition, manufacturer, model, year, oem_number, warehouse_location, warehouse_location_id"
        )
        .eq("id", id)
        .eq("seller_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (listingError || !data) {
        setError(
          listingError?.message ||
            "Skelbimas nerastas arba nepriklauso tau."
        );
        setLoading(false);
        return;
      }

      const {
        data: imageRows,
        error: imagesError,
      } = await supabase
        .from("listing_images")
        .select(
          "id, image_path, sort_order"
        )
        .eq("listing_id", id)
        .order("sort_order", {
          ascending: true,
        })
        .order("id", {
          ascending: true,
        });

      if (cancelled) return;

      if (imagesError) {
        setError(imagesError.message);
        setLoading(false);
        return;
      }

      const loadedPhotos: Photo[] = (
        imageRows ?? []
      ).map((image) => ({
        key: image.id,
        id: image.id,
        image_path: image.image_path,
        url: supabase.storage
          .from("listing-images")
          .getPublicUrl(
            image.image_path
          ).data.publicUrl,
        rotation: 0,
        positionX: 50,
        positionY: 50,
        zoom: 1,
        changed: false,
      }));

      const loadedListing =
        data as Listing;

      setListing(loadedListing);
      setPhotos(loadedPhotos);
      setRemovedPhotos([]);

      setWarehouseSearch(
        loadedListing.warehouse_location ??
          ""
      );

      setWarehouseFilterActive(false);

      // Sandėlio vietos reikalingos tik detalėms.
      if (
        loadedListing.sale_type !== "vehicle"
      ) {
        setWarehouseLoading(true);

        const {
          data: locationRows,
          error: locationError,
        } = await supabase
          .from("warehouse_locations")
          .select(
            "id, code, description"
          )
          .eq("seller_id", userId)
          .order("code", {
            ascending: true,
          });

        if (cancelled) return;

        if (locationError) {
          setWarehouseError(
            "Nepavyko įkelti sandėlio vietų: " +
              locationError.message
          );
        } else {
          const locations = (
            locationRows ?? []
          ) as WarehouseLocation[];

          setWarehouseLocations(
            locations
          );

          const selectedLocation =
            locations.find(
              (location) =>
                location.id ===
                loadedListing.warehouse_location_id
            );

          if (selectedLocation) {
            setWarehouseSearch(
              selectedLocation.code
            );
          }
        }

        setWarehouseLoading(false);
      }

      setLoading(false);
    }

    void loadListing();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateField<
    K extends keyof Listing
  >(
    field: K,
    value: Listing[K]
  ) {
    setListing((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous
    );
  }

  function selectWarehouseLocation(
    location: WarehouseLocation
  ) {
    setListing((previous) =>
      previous
        ? {
            ...previous,
            warehouse_location_id:
              location.id,
            warehouse_location:
              location.code,
          }
        : previous
    );

    setWarehouseSearch(
      location.code
    );

    setWarehouseDropdownOpen(false);
    setWarehouseFilterActive(false);
    setWarehouseError("");
    setShowNewWarehouse(false);
  }

  function openWarehouseDropdown() {
    setWarehouseFilterActive(false);
    setWarehouseDropdownOpen(true);
  }

  function handleWarehouseSearch(
    value: string
  ) {
    setWarehouseSearch(value);
    setWarehouseDropdownOpen(true);
    setWarehouseFilterActive(true);
    setWarehouseError("");

    setListing((previous) =>
      previous
        ? {
            ...previous,
            warehouse_location_id: null,
            warehouse_location: value,
          }
        : previous
    );
  }

  function clearWarehouseLocation() {
    setWarehouseSearch("");
    setWarehouseDropdownOpen(false);
    setWarehouseFilterActive(false);
    setShowNewWarehouse(false);
    setWarehouseError("");

    setListing((previous) =>
      previous
        ? {
            ...previous,
            warehouse_location: null,
            warehouse_location_id: null,
          }
        : previous
    );
  }

  async function createWarehouseLocation() {
    if (
      creatingWarehouse ||
      saving ||
      isVehicle
    ) {
      return;
    }

    const code =
      newWarehouseCode
        .trim()
        .toUpperCase();

    const description =
      newWarehouseDescription.trim();

    if (!code) {
      setWarehouseError(
        "Įvesk naujos sandėlio vietos kodą."
      );
      return;
    }

    setCreatingWarehouse(true);
    setWarehouseError("");

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Sesija baigėsi. Prisijunk iš naujo."
        );
      }

      const existingLocation =
        warehouseLocations.find(
          (location) =>
            location.code.toUpperCase() ===
            code
        );

      if (existingLocation) {
        selectWarehouseLocation(
          existingLocation
        );

        setNewWarehouseCode("");
        setNewWarehouseDescription("");
        return;
      }

      const {
        data: created,
        error: createError,
      } = await supabase
        .from("warehouse_locations")
        .insert({
          seller_id: authData.user.id,
          code,
          description:
            description || null,
        })
        .select(
          "id, code, description"
        )
        .single();

      if (createError || !created) {
        throw new Error(
          createError?.message ||
            "Nepavyko sukurti sandėlio vietos."
        );
      }

      const newLocation =
        created as WarehouseLocation;

      setWarehouseLocations(
        (previous) =>
          [...previous, newLocation].sort(
            (a, b) =>
              a.code.localeCompare(
                b.code
              )
          )
      );

      selectWarehouseLocation(
        newLocation
      );

      setNewWarehouseCode("");
      setNewWarehouseDescription("");
    } catch (caughtError) {
      setWarehouseError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nepavyko sukurti sandėlio vietos."
      );
    } finally {
      setCreatingWarehouse(false);
    }
  }

  const normalizedWarehouseSearch =
    warehouseSearch
      .trim()
      .toLowerCase();

  const filteredWarehouseLocations =
    warehouseFilterActive
      ? warehouseLocations.filter(
          (location) =>
            location.code
              .toLowerCase()
              .includes(
                normalizedWarehouseSearch
              ) ||
            (
              location.description ?? ""
            )
              .toLowerCase()
              .includes(
                normalizedWarehouseSearch
              )
        )
      : warehouseLocations;

  function updatePhoto(
    key: string,
    changes: Partial<Photo>
  ) {
    if (saving) return;

    setPhotos((previous) =>
      previous.map((photo) =>
        photo.key === key
          ? {
              ...photo,
              ...changes,
              changed: true,
            }
          : photo
      )
    );
  }

  function rotatePhoto(
    key: string,
    degrees: number
  ) {
    const photo = photos.find(
      (item) => item.key === key
    );

    if (!photo) return;

    updatePhoto(key, {
      rotation:
        (photo.rotation +
          degrees +
          360) %
        360,
    });
  }

  function movePhoto(
    index: number,
    direction: number
  ) {
    if (saving) return;

    setPhotos((previous) =>
      moveItem(
        previous,
        index,
        index + direction
      )
    );
  }

  function handleImages(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(
      event.target.files ?? []
    );

    event.target.value = "";

    if (!files.length) return;

    if (
      photos.length + files.length >
      MAX_IMAGES
    ) {
      setError(
        "Galima turėti daugiausia 6 nuotraukas."
      );
      return;
    }

    for (const file of files) {
      if (
        !ALLOWED_TYPES.includes(
          file.type
        )
      ) {
        setError(
          "Leidžiami tik JPG, PNG ir WEBP formatai."
        );
        return;
      }

      if (file.size > MAX_SIZE) {
        setError(
          "Viena nuotrauka negali viršyti 10 MB."
        );
        return;
      }
    }

    const added: Photo[] =
      files.map((file) => {
        const url =
          URL.createObjectURL(file);

        previewUrlsRef.current.push(
          url
        );

        return {
          key: crypto.randomUUID(),
          file,
          url,
          rotation: 0,
          positionX: 50,
          positionY: 50,
          zoom: 1,
          changed: true,
        };
      });

    setPhotos((previous) => [
      ...previous,
      ...added,
    ]);

    setError("");
  }

  function removePhoto(
    photo: Photo
  ) {
    if (saving) return;

    setPhotos((previous) =>
      previous.filter(
        (item) =>
          item.key !== photo.key
      )
    );

    if (photo.id) {
      setRemovedPhotos(
        (previous) => [
          ...previous,
          photo,
        ]
      );
    }
  }

  function restorePhoto(
    photo: Photo
  ) {
    if (
      saving ||
      photos.length >= MAX_IMAGES
    ) {
      return;
    }

    setRemovedPhotos(
      (previous) =>
        previous.filter(
          (item) =>
            item.key !== photo.key
        )
    );

    setPhotos((previous) => [
      ...previous,
      photo,
    ]);
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !listing ||
      saving ||
      creatingWarehouse
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setProgress("");

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Sesija baigėsi. Prisijunk iš naujo."
        );
      }

      if (!listing.title.trim()) {
        throw new Error(
          "Įvesk skelbimo pavadinimą."
        );
      }

      if (
        !Number.isFinite(
          Number(listing.price)
        ) ||
        Number(listing.price) < 0
      ) {
        throw new Error(
          "Įvesk teisingą kainą."
        );
      }

      let selectedWarehouseId =
        listing.warehouse_location_id;

      let selectedWarehouseCode =
        listing.warehouse_location;

      if (!isVehicle) {
        const locationText =
          warehouseSearch.trim();

        if (!locationText) {
          selectedWarehouseId = null;
          selectedWarehouseCode = null;
        } else {
          const matchingLocation =
            warehouseLocations.find(
              (location) =>
                location.code.toLowerCase() ===
                locationText.toLowerCase()
            );

          if (matchingLocation) {
            selectedWarehouseId =
              matchingLocation.id;

            selectedWarehouseCode =
              matchingLocation.code;
          } else {
            throw new Error(
              "Pasirink sandėlio vietą iš sąrašo arba sukurk naują vietą."
            );
          }
        }
      }

      setProgress(
        "Saugomi skelbimo duomenys..."
      );

      const updateData: {
        title: string;
        description: string | null;
        price: number;
        category: string;
        condition: string;
        manufacturer: string | null;
        model: string | null;
        year: number | null;
        oem_number?: string | null;
        warehouse_location?: string | null;
        warehouse_location_id?: string | null;
      } = {
        title: listing.title.trim(),
        description:
          listing.description?.trim() ||
          null,
        price: Number(listing.price),
        category: listing.category,
        condition: listing.condition,
        manufacturer:
          listing.manufacturer?.trim() ||
          null,
        model:
          listing.model?.trim() ||
          null,
        year: listing.year
          ? Number(listing.year)
          : null,
      };

      // Detalių sandėlio duomenų neliečiame,
      // kai redaguojama transporto priemonė.
      if (!isVehicle) {
        updateData.oem_number =
          listing.oem_number?.trim() ||
          null;

        updateData.warehouse_location =
          selectedWarehouseCode;

        updateData.warehouse_location_id =
          selectedWarehouseId;
      }

      const {
        data,
        error: updateError,
      } = await supabase
        .from("listings")
        .update(updateData)
        .eq("id", listing.id)
        .eq(
          "seller_id",
          authData.user.id
        )
        .select("id")
        .single();

      if (updateError || !data) {
        throw new Error(
          updateError?.message ||
            "Nepavyko išsaugoti skelbimo."
        );
      }

      const finalPhotos: {
        id: string;
        image_path: string;
        sort_order: number;
      }[] = [];

      const replacedPhotos: Photo[] =
        [];

      for (
        let index = 0;
        index < photos.length;
        index++
      ) {
        const photo = photos[index];

        if (
          photo.id &&
          !photo.changed
        ) {
          finalPhotos.push({
            id: photo.id,
            image_path:
              photo.image_path!,
            sort_order: index,
          });

          continue;
        }

        setProgress(
          `Apdorojama nuotrauka ${
            index + 1
          } iš ${photos.length}...`
        );

        const processedFile =
          await preparePhoto(photo);

        const imagePath =
          `${authData.user.id}/${listing.id}/` +
          `${crypto.randomUUID()}.webp`;

        const {
          error: uploadError,
        } = await supabase.storage
          .from("listing-images")
          .upload(
            imagePath,
            processedFile,
            {
              contentType:
                "image/webp",
              upsert: false,
            }
          );

        if (uploadError) {
          throw new Error(
            uploadError.message
          );
        }

        const {
          data: inserted,
          error: insertError,
        } = await supabase
          .from("listing_images")
          .insert({
            listing_id:
              listing.id,
            image_path:
              imagePath,
            sort_order: index,
          })
          .select("id")
          .single();

        if (
          insertError ||
          !inserted
        ) {
          await supabase.storage
            .from("listing-images")
            .remove([imagePath]);

          throw new Error(
            insertError?.message ||
              "Nepavyko išsaugoti nuotraukos."
          );
        }

        finalPhotos.push({
          id: inserted.id,
          image_path: imagePath,
          sort_order: index,
        });

        if (photo.id) {
          replacedPhotos.push(
            photo
          );
        }
      }

      for (const photo of finalPhotos) {
        const {
          error: orderError,
        } = await supabase
          .from("listing_images")
          .update({
            sort_order:
              photo.sort_order,
          })
          .eq("id", photo.id)
          .eq(
            "listing_id",
            listing.id
          );

        if (orderError) {
          throw new Error(
            "Nepavyko išsaugoti nuotraukų eiliškumo: " +
              orderError.message
          );
        }
      }

      const toDelete = [
        ...removedPhotos,
        ...replacedPhotos,
      ];

      for (const photo of toDelete) {
        if (
          !photo.id ||
          !photo.image_path
        ) {
          continue;
        }

        const {
          error: deleteError,
        } = await supabase
          .from("listing_images")
          .delete()
          .eq("id", photo.id)
          .eq(
            "listing_id",
            listing.id
          );

        if (deleteError) {
          throw new Error(
            deleteError.message
          );
        }

        const {
          error: storageError,
        } = await supabase.storage
          .from("listing-images")
          .remove([
            photo.image_path,
          ]);

        if (storageError) {
          console.warn(
            "Nepavyko pašalinti seno failo:",
            storageError.message
          );
        }
      }

      router.push("/my-listings");
      router.refresh();
    } catch (err) {
      setError(
        (err instanceof Error
          ? err.message
          : "Įvyko nežinoma klaida.") +
          " Jei dalis pakeitimų jau buvo išsaugota, prieš kartodamas veiksmą atnaujink puslapį."
      );
    } finally {
      setSaving(false);
      setProgress("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F7F6] p-10">
        Įkeliamas skelbimas...
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#F5F7F6] p-10">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-8">
          <p className="mb-5 text-red-700">
            {error}
          </p>

          <Link
            href="/my-listings"
            className="font-semibold text-[#426A70]"
          >
            ← Grįžti į mano skelbimus
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <form
        onSubmit={handleSave}
        className="mx-auto max-w-2xl space-y-5 rounded-2xl bg-white p-6 shadow-lg sm:p-8"
      >
        <Link
          href="/my-listings"
          className="inline-block text-sm font-semibold text-[#426A70]"
        >
          ← Mano skelbimai
        </Link>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#EDF4F2] px-3 py-1 text-sm font-bold text-[#426A70]">
              {isVehicle
                ? isMotorcycle
                  ? "🏍️ Motociklas"
                  : "🚗 Automobilis"
                : isMotorcycle
                  ? "🏍️ Motociklo detalė"
                  : "🚗 Automobilio detalė"}
            </span>
          </div>

          <h1 className="text-3xl font-black text-[#24333D]">
            {isVehicle
              ? "✏️ Redaguoti transporto priemonę"
              : "✏️ Redaguoti detalę"}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {isVehicle
              ? "Atnaujink transporto priemonės informaciją ir nuotraukas."
              : "Atnaujink detalės informaciją, sandėlio vietą ir nuotraukas."}
          </p>
        </div>

        {/* PAVADINIMAS */}

        <label className="block font-semibold text-[#24333D]">
          {isVehicle
            ? "Skelbimo pavadinimas *"
            : "Detalės pavadinimas *"}

          <input
            required
            maxLength={150}
            value={listing.title}
            onChange={(event) =>
              updateField(
                "title",
                event.target.value
              )
            }
            placeholder={
              isVehicle
                ? "Pvz. BMW 320d 2018 m."
                : "Pvz. BMW priekinis žibintas"
            }
            className={inputStyle}
          />
        </label>

        {/* MARKĖ */}

        <label className="block font-semibold text-[#24333D]">
          Markė

          <input
            value={
              listing.manufacturer ?? ""
            }
            onChange={(event) =>
              updateField(
                "manufacturer",
                event.target.value
              )
            }
            placeholder="Pvz. BMW"
            className={inputStyle}
          />
        </label>

        {/* MODELIS */}

        <label className="block font-semibold text-[#24333D]">
          Modelis

          <input
            value={listing.model ?? ""}
            onChange={(event) =>
              updateField(
                "model",
                event.target.value
              )
            }
            placeholder="Pvz. 320d"
            className={inputStyle}
          />
        </label>

        {/* METAI */}

        <label className="block font-semibold text-[#24333D]">
          {isVehicle
            ? "Pagaminimo metai"
            : "Transporto priemonės metai"}

          <input
            type="number"
            min="1900"
            max="2100"
            value={listing.year ?? ""}
            onChange={(event) =>
              updateField(
                "year",
                event.target.value
                  ? Number(
                      event.target.value
                    )
                  : null
              )
            }
            className={inputStyle}
          />
        </label>

        {/* TRANSPORTO PRIEMONĖS TIPAS */}

        <label className="block font-semibold text-[#24333D]">
          Transporto priemonės tipas

          <select
            value={listing.category}
            onChange={(event) =>
              updateField(
                "category",
                event.target.value
              )
            }
            className={inputStyle}
          >
            <option value="car">
              Automobilis
            </option>

            <option value="motorcycle">
              Motociklas
            </option>
          </select>
        </label>

        {/* BŪKLĖ */}

        <label className="block font-semibold text-[#24333D]">
          Būklė

          <select
            value={listing.condition}
            onChange={(event) =>
              updateField(
                "condition",
                event.target.value
              )
            }
            className={inputStyle}
          >
            <option value="used">
              Naudota
            </option>

            <option value="new">
              Nauja
            </option>
          </select>
        </label>

        {/* KAINA */}

        <label className="block font-semibold text-[#24333D]">
          {isVehicle
            ? "Transporto priemonės kaina (€) *"
            : "Detalės kaina (€) *"}

          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={listing.price}
            onChange={(event) =>
              updateField(
                "price",
                Number(
                  event.target.value
                )
              )
            }
            className={inputStyle}
          />
        </label>

        {/* APRAŠYMAS */}

        <label className="block font-semibold text-[#24333D]">
          Aprašymas

          <textarea
            rows={5}
            value={
              listing.description ?? ""
            }
            onChange={(event) =>
              updateField(
                "description",
                event.target.value
              )
            }
            placeholder={
              isVehicle
                ? "Aprašyk transporto priemonės būklę, komplektaciją ir kitą svarbią informaciją."
                : "Aprašyk detalės būklę ir kitą svarbią informaciją."
            }
            className={inputStyle}
          />
        </label>

        {/* TIK DETALĖMS */}

        {!isVehicle && (
          <>
            {/* OEM */}

            <label className="block font-semibold text-[#24333D]">
              OEM detalės kodas

              <input
                value={
                  listing.oem_number ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "oem_number",
                    event.target.value
                  )
                }
                className={inputStyle}
              />
            </label>

            {/* SANDĖLIO VIETA */}

            <section className="rounded-xl border border-[#C9DAD7] bg-[#F5F7F6] p-4 sm:p-5">
              <h2 className="text-lg font-bold text-[#24333D]">
                📍 Sandėlio vieta
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Paspausk laukelį, kad matytum visas
                vietas, arba pradėk rašyti, kad
                surastum reikiamą.
              </p>

              <div
                ref={warehouseContainerRef}
                className="relative mt-4"
              >
                <label
                  htmlFor="warehouse-search"
                  className="block text-sm font-semibold text-[#24333D]"
                >
                  Sandėlio vietos kodas
                </label>

                <div className="mt-2 flex gap-2">
                  <input
                    id="warehouse-search"
                    type="text"
                    autoComplete="off"
                    value={warehouseSearch}
                    disabled={
                      saving ||
                      creatingWarehouse
                    }
                    onFocus={
                      openWarehouseDropdown
                    }
                    onClick={
                      openWarehouseDropdown
                    }
                    onChange={(event) =>
                      handleWarehouseSearch(
                        event.target.value
                      )
                    }
                    placeholder="Pvz. A1 arba TEST8"
                    className="w-full min-w-0 rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-[#426A70]"
                  />

                  {warehouseSearch && (
                    <button
                      type="button"
                      disabled={
                        saving ||
                        creatingWarehouse
                      }
                      onClick={
                        clearWarehouseLocation
                      }
                      className="rounded-lg border border-slate-300 bg-white px-4 font-bold text-slate-600 disabled:opacity-50"
                      title="Išvalyti vietą"
                    >
                      ×
                    </button>
                  )}
                </div>

                {warehouseDropdownOpen &&
                  !warehouseLoading && (
                    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#C9DAD7] bg-white shadow-xl">
                      {filteredWarehouseLocations.length >
                      0 ? (
                        filteredWarehouseLocations.map(
                          (location) => (
                            <button
                              key={
                                location.id
                              }
                              type="button"
                              disabled={
                                saving ||
                                creatingWarehouse
                              }
                              onClick={() =>
                                selectWarehouseLocation(
                                  location
                                )
                              }
                              className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-[#EDF4F2] disabled:opacity-50"
                            >
                              <span className="block font-bold text-[#24333D]">
                                {
                                  location.code
                                }
                              </span>

                              {location.description && (
                                <span className="mt-1 block text-xs text-slate-500">
                                  {
                                    location.description
                                  }
                                </span>
                              )}

                              {location.id ===
                                listing.warehouse_location_id && (
                                <span className="mt-1 block text-xs font-semibold text-emerald-700">
                                  ✓ Šiuo metu pasirinkta
                                </span>
                              )}
                            </button>
                          )
                        )
                      ) : (
                        <p className="p-4 text-sm text-slate-500">
                          Atitinkančių vietų nerasta.
                        </p>
                      )}
                    </div>
                  )}
              </div>

              {warehouseLoading && (
                <p className="mt-2 text-sm text-slate-500">
                  Įkeliamos sandėlio vietos...
                </p>
              )}

              {listing.warehouse_location_id && (
                <p className="mt-3 text-sm font-semibold text-emerald-700">
                  ✓ Pasirinkta vieta:{" "}
                  {
                    listing.warehouse_location
                  }
                </p>
              )}

              <div className="mt-4">
                <button
                  type="button"
                  disabled={
                    saving ||
                    creatingWarehouse
                  }
                  onClick={() => {
                    setShowNewWarehouse(
                      (previous) =>
                        !previous
                    );

                    setWarehouseDropdownOpen(
                      false
                    );

                    setWarehouseError("");

                    if (
                      !showNewWarehouse &&
                      warehouseSearch &&
                      !listing.warehouse_location_id
                    ) {
                      setNewWarehouseCode(
                        warehouseSearch
                      );
                    }
                  }}
                  className="rounded-lg border border-[#426A70] bg-white px-4 py-3 text-sm font-bold text-[#426A70] hover:bg-[#EDF4F2] disabled:opacity-50"
                >
                  {showNewWarehouse
                    ? "− Uždaryti naujos vietos kūrimą"
                    : "+ Pridėti naują sandėlio vietą"}
                </button>

                {showNewWarehouse && (
                  <div className="mt-4 space-y-3 rounded-xl border border-[#D9E2E0] bg-white p-4">
                    <h3 className="font-bold text-[#24333D]">
                      Nauja sandėlio vieta
                    </h3>

                    <label className="block text-sm font-semibold text-[#24333D]">
                      Vietos kodas *

                      <input
                        type="text"
                        value={
                          newWarehouseCode
                        }
                        disabled={
                          creatingWarehouse ||
                          saving
                        }
                        onChange={(
                          event
                        ) =>
                          setNewWarehouseCode(
                            event.target.value
                          )
                        }
                        placeholder="Pvz. B-02-04"
                        className={
                          inputStyle
                        }
                      />
                    </label>

                    <label className="block text-sm font-semibold text-[#24333D]">
                      Aprašymas

                      <input
                        type="text"
                        value={
                          newWarehouseDescription
                        }
                        disabled={
                          creatingWarehouse ||
                          saving
                        }
                        onChange={(
                          event
                        ) =>
                          setNewWarehouseDescription(
                            event.target.value
                          )
                        }
                        placeholder="Pvz. Lentyna B, 2 aukštas"
                        className={
                          inputStyle
                        }
                      />
                    </label>

                    <button
                      type="button"
                      disabled={
                        creatingWarehouse ||
                        saving ||
                        !newWarehouseCode.trim()
                      }
                      onClick={() =>
                        void createWarehouseLocation()
                      }
                      className="w-full rounded-lg bg-[#426A70] px-4 py-3 font-bold text-white hover:bg-[#35565B] disabled:opacity-50"
                    >
                      {creatingWarehouse
                        ? "Kuriama..."
                        : "Sukurti ir pasirinkti vietą"}
                    </button>
                  </div>
                )}
              </div>

              {warehouseError && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {warehouseError}
                </p>
              )}
            </section>
          </>
        )}

        {/* NUOTRAUKOS */}

        <section className="rounded-xl border-2 border-dashed border-[#9BB5B7] bg-[#F5F7F6] p-4 sm:p-5">
          <h2 className="text-lg font-bold text-[#24333D]">
            📷{" "}
            {isVehicle
              ? "Transporto priemonės nuotraukos"
              : "Detalės nuotraukos"}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Nuotraukų: {photos.length} iš{" "}
            {MAX_IMAGES}. Pirmoji nuotrauka
            bus pagrindinė.
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Rodyklėmis keisk eiliškumą,
            ↶ ir ↷ pasuk nuotraukas.
            Poziciją ir priartinimą
            reguliuok po kiekviena nuotrauka.
          </p>

          {photos.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {photos.map(
                (photo, index) => {
                  const cropEnabled =
                    photo.positionX !==
                      50 ||
                    photo.positionY !==
                      50 ||
                    photo.zoom !== 1;

                  return (
                    <div
                      key={photo.key}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="flex items-center justify-between bg-[#E8F0EE] px-3 py-2">
                        <span className="text-sm font-bold text-[#24333D]">
                          {index === 0
                            ? "★ Pagrindinė"
                            : `Nuotrauka ${
                                index + 1
                              }`}
                        </span>

                        <span className="text-xs text-slate-600">
                          {photo.file
                            ? "Nauja"
                            : "Įkelta"}
                        </span>
                      </div>

                      <div className="flex h-44 items-center justify-center overflow-hidden bg-slate-100">
                        <img
                          src={
                            photo.url
                          }
                          alt={`Skelbimo nuotrauka ${
                            index + 1
                          }`}
                          className={
                            cropEnabled
                              ? "h-full w-full object-cover"
                              : "h-full w-full object-contain"
                          }
                          style={{
                            objectPosition: `${photo.positionX}% ${photo.positionY}%`,
                            transform: `rotate(${photo.rotation}deg) scale(${photo.zoom})`,
                          }}
                        />
                      </div>

                      <div className="space-y-3 p-3">
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            disabled={
                              saving ||
                              index === 0
                            }
                            onClick={() =>
                              movePhoto(
                                index,
                                -1
                              )
                            }
                            title="Perkelti į kairę"
                            className="rounded-lg bg-[#E8F0EE] p-2 font-bold text-[#426A70] disabled:opacity-30"
                          >
                            ←
                          </button>

                          <button
                            type="button"
                            disabled={
                              saving ||
                              index ===
                                photos.length -
                                  1
                            }
                            onClick={() =>
                              movePhoto(
                                index,
                                1
                              )
                            }
                            title="Perkelti į dešinę"
                            className="rounded-lg bg-[#E8F0EE] p-2 font-bold text-[#426A70] disabled:opacity-30"
                          >
                            →
                          </button>

                          <button
                            type="button"
                            disabled={
                              saving
                            }
                            onClick={() =>
                              rotatePhoto(
                                photo.key,
                                -90
                              )
                            }
                            title="Pasukti į kairę"
                            className="rounded-lg bg-[#E8F0EE] p-2 text-xl font-bold text-[#426A70]"
                          >
                            ↶
                          </button>

                          <button
                            type="button"
                            disabled={
                              saving
                            }
                            onClick={() =>
                              rotatePhoto(
                                photo.key,
                                90
                              )
                            }
                            title="Pasukti į dešinę"
                            className="rounded-lg bg-[#E8F0EE] p-2 text-xl font-bold text-[#426A70]"
                          >
                            ↷
                          </button>
                        </div>

                        <label className="block text-xs font-semibold text-slate-700">
                          Horizontali pozicija

                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={
                              photo.positionX
                            }
                            disabled={
                              saving
                            }
                            onChange={(
                              event
                            ) =>
                              updatePhoto(
                                photo.key,
                                {
                                  positionX:
                                    Number(
                                      event
                                        .target
                                        .value
                                    ),
                                }
                              )
                            }
                            className="mt-2 w-full accent-[#426A70]"
                          />
                        </label>

                        <label className="block text-xs font-semibold text-slate-700">
                          Vertikali pozicija

                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={
                              photo.positionY
                            }
                            disabled={
                              saving
                            }
                            onChange={(
                              event
                            ) =>
                              updatePhoto(
                                photo.key,
                                {
                                  positionY:
                                    Number(
                                      event
                                        .target
                                        .value
                                    ),
                                }
                              )
                            }
                            className="mt-2 w-full accent-[#426A70]"
                          />
                        </label>

                        <label className="block text-xs font-semibold text-slate-700">
                          Priartinimas:{" "}
                          {photo.zoom.toFixed(
                            1
                          )}
                          ×

                          <input
                            type="range"
                            min="1"
                            max="2"
                            step="0.1"
                            value={
                              photo.zoom
                            }
                            disabled={
                              saving
                            }
                            onChange={(
                              event
                            ) =>
                              updatePhoto(
                                photo.key,
                                {
                                  zoom:
                                    Number(
                                      event
                                        .target
                                        .value
                                    ),
                                }
                              )
                            }
                            className="mt-2 w-full accent-[#426A70]"
                          />
                        </label>

                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            updatePhoto(
                              photo.key,
                              {
                                rotation: 0,
                                positionX: 50,
                                positionY: 50,
                                zoom: 1,
                              }
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 p-2 text-sm font-semibold text-slate-700"
                        >
                          Atstatyti vaizdą
                        </button>

                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            removePhoto(
                              photo
                            )
                          }
                          className="w-full rounded-lg border border-red-200 p-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Pašalinti
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* PAŠALINTŲ NUOTRAUKŲ ATKŪRIMAS */}

          {removedPhotos.length > 0 && (
            <div className="mt-4 rounded-lg bg-orange-50 p-3">
              <p className="mb-2 text-sm font-semibold">
                Pažymėta pašalinti:{" "}
                {removedPhotos.length}
              </p>

              {removedPhotos.map(
                (photo, index) => (
                  <button
                    key={photo.key}
                    type="button"
                    disabled={
                      saving ||
                      photos.length >=
                        MAX_IMAGES
                    }
                    onClick={() =>
                      restorePhoto(
                        photo
                      )
                    }
                    className="mb-2 mr-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-[#426A70]"
                  >
                    Atšaukti pašalinimą{" "}
                    {index + 1}
                  </button>
                )
              )}
            </div>
          )}

          {/* NAUJŲ NUOTRAUKŲ PRIDĖJIMAS */}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={
              saving ||
              photos.length >=
                MAX_IMAGES
            }
            onChange={
              handleImages
            }
            className="sr-only"
            aria-label="Pasirinkti nuotraukas"
          />

          <button
            type="button"
            disabled={
              saving ||
              photos.length >=
                MAX_IMAGES
            }
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-[#426A70] px-5 py-5 text-lg font-bold text-white transition hover:bg-[#35565B] disabled:opacity-50"
          >
            <span className="text-2xl">
              +
            </span>

            Pridėti nuotraukas
          </button>

          <p className="mt-3 text-center text-sm text-slate-600">
            JPG, PNG arba WEBP.
            Iki 6 nuotraukų,
            po 10 MB.
          </p>
        </section>

        {/* IŠSAUGOJIMO EIGA */}

        {progress && (
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            {progress}
          </p>
        )}

        {/* KLAIDOS */}

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-4 text-red-700"
          >
            {error}
          </p>
        )}

        {/* IŠSAUGOTI */}

        <button
          type="submit"
          disabled={
            saving ||
            creatingWarehouse
          }
          className="w-full rounded-lg bg-[#426A70] p-4 font-bold text-white transition hover:bg-[#35565B] disabled:opacity-50"
        >
          {saving
            ? "Saugoma..."
            : "Išsaugoti pakeitimus"}
        </button>

        <Link
          href="/my-listings"
          className="block text-center font-semibold text-slate-600"
        >
          Atšaukti
        </Link>
      </form>
    </main>
  );
}

// AUTO_MOTO_EDIT_LISTING_SUSPENSE_V1
export default function EditListingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
          <div className="mx-auto max-w-4xl">
            <p className="text-slate-700">Įkeliamas skelbimo redagavimas...</p>
          </div>
        </main>
      }
    >
      <EditListingContent />
    </Suspense>
  );
}
