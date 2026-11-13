
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = "car" | "motorcycle";

type VehicleMake = {
  id: number;
  name: string;
  category: Category;
};

type VehicleModel = {
  id: number;
  make_id: number;
  name: string;
};

type Props = {
  category: Category;
  manufacturer: string;
  model: string;
  onManufacturerChange: (value: string) => void;
  onModelChange: (value: string) => void;
  disabled?: boolean;
};

export default function VehicleMakeModelPicker({
  category,
  manufacturer,
  model,
  onManufacturerChange,
  onModelChange,
  disabled = false,
}: Props) {
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [makesLoading, setMakesLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [error, setError] = useState("");

  const [makeOpen, setMakeOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const [makeSearching, setMakeSearching] = useState(false);
  const [modelSearching, setModelSearching] = useState(false);

  const inputStyle =
    "mt-2 w-full rounded-xl border border-[#D9E2E0] bg-white p-3 pr-10 text-[#24333D] outline-none focus:border-[#426A70] focus:ring-2 focus:ring-[#426A70]/15 disabled:opacity-50";

  useEffect(() => {
    let active = true;

    async function loadMakes() {
      setMakesLoading(true);
      setError("");
      setMakes([]);
      setModels([]);

      const { data, error: loadError } = await supabase
        .from("vehicle_makes")
        .select("id, name, category")
        .eq("category", category)
        .order("name");

      if (!active) return;

      if (loadError) {
        setError("Nepavyko įkelti markių: " + loadError.message);
      } else {
        setMakes((data ?? []) as VehicleMake[]);
      }

      setMakesLoading(false);
    }

    void loadMakes();

    return () => {
      active = false;
    };
  }, [category]);

  const selectedMake = useMemo(
    () =>
      makes.find(
        (make) =>
          make.name.toLocaleLowerCase("lt") ===
          manufacturer.trim().toLocaleLowerCase("lt")
      ),
    [makes, manufacturer]
  );

  useEffect(() => {
    let active = true;

    async function loadModels() {
      setModels([]);

      if (!selectedMake) {
        setModelsLoading(false);
        return;
      }

      setModelsLoading(true);

      const { data, error: loadError } = await supabase
        .from("vehicle_models")
        .select("id, make_id, name")
        .eq("make_id", selectedMake.id)
        .order("name");

      if (!active) return;

      if (loadError) {
        setError("Nepavyko įkelti modelių: " + loadError.message);
      } else {
        setModels((data ?? []) as VehicleModel[]);
      }

      setModelsLoading(false);
    }

    void loadModels();

    return () => {
      active = false;
    };
  }, [selectedMake]);

  const filteredMakes = makes.filter((make) =>
    !makeSearching ||
    make.name
      .toLocaleLowerCase("lt")
      .includes(manufacturer.trim().toLocaleLowerCase("lt"))
  );

  const filteredModels = models.filter((item) =>
    !modelSearching ||
    item.name
      .toLocaleLowerCase("lt")
      .includes(model.trim().toLocaleLowerCase("lt"))
  );

  function chooseMake(name: string) {
    if (name !== manufacturer) {
      onModelChange("");
    }

    onManufacturerChange(name);
    setMakeOpen(false);
    setModelOpen(false);
    setMakeSearching(false);
    setModelSearching(false);
  }

  function chooseModel(name: string) {
    onModelChange(name);
    setModelOpen(false);
    setModelSearching(false);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="relative">
        <label
          htmlFor="vehicle-make"
          className="block font-semibold text-[#24333D]"
        >
          Markė *
        </label>

        <input
          id="vehicle-make"
          type="text"
          required
          autoComplete="off"
          value={manufacturer}
          onChange={(event) => {
            onManufacturerChange(event.target.value);
            onModelChange("");
            setMakeSearching(true);
            setMakeOpen(true);
            setModelOpen(false);
          }}
          onFocus={() => {
            setMakeSearching(false);
            setMakeOpen(true);
            setModelOpen(false);
          }}
          onClick={() => {
            setMakeSearching(false);
            setMakeOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setMakeOpen(false), 150);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMakeOpen(false);
          }}
          placeholder={
            makesLoading ? "Kraunamos markės..." : "Pvz., BMW"
          }
          disabled={disabled}
          className={inputStyle}
        />

        {manufacturer && !disabled && (
          <button
            type="button"
            aria-label="Išvalyti markę"
            title="Išvalyti markę"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onManufacturerChange("");
              onModelChange("");
              setMakeSearching(false);
              setMakeOpen(true);
            }}
            className="absolute right-3 top-10 text-xl text-slate-500 hover:text-[#24333D]"
          >
            ×
          </button>
        )}

        {makeOpen && !disabled && !makesLoading && (
          <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#D9E2E0] bg-white p-1 shadow-xl">
            {filteredMakes.length > 0 ? (
              filteredMakes.map((make) => (
                <button
                  key={make.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseMake(make.name)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#EDF4F2]"
                >
                  {make.name}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-xs text-slate-500">
                Markė nerasta. Gali įrašyti rankiniu būdu.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <label
          htmlFor="vehicle-model"
          className="block font-semibold text-[#24333D]"
        >
          Modelis *
        </label>

        <input
          id="vehicle-model"
          type="text"
          required
          autoComplete="off"
          value={model}
          onChange={(event) => {
            onModelChange(event.target.value);
            setModelSearching(true);
            setModelOpen(true);
          }}
          onFocus={() => {
            setModelSearching(false);
            setModelOpen(true);
            setMakeOpen(false);
          }}
          onClick={() => {
            setModelSearching(false);
            setModelOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setModelOpen(false), 150);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setModelOpen(false);
          }}
          placeholder={
            modelsLoading
              ? "Kraunami modeliai..."
              : "Pvz., Golf, X5, A4"
          }
          disabled={disabled || !manufacturer.trim()}
          className={inputStyle}
        />

        {model && !disabled && (
          <button
            type="button"
            aria-label="Išvalyti modelį"
            title="Išvalyti modelį"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onModelChange("");
              setModelSearching(false);
              setModelOpen(true);
            }}
            className="absolute right-3 top-10 text-xl text-slate-500 hover:text-[#24333D]"
          >
            ×
          </button>
        )}

        {modelOpen &&
          !disabled &&
          !modelsLoading &&
          manufacturer.trim() && (
            <div className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#D9E2E0] bg-white p-1 shadow-xl">
              {filteredModels.length > 0 ? (
                filteredModels.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseModel(item.name)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#EDF4F2]"
                  >
                    {item.name}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-slate-500">
                  Modelis nerastas. Gali įrašyti rankiniu būdu.
                </p>
              )}
            </div>
          )}
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-700 sm:col-span-2"
        >
          {error}
        </p>
      )}
    </div>
  );
}
