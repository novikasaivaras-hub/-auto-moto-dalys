"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

type DataRow = Record<string, string>;

type FieldKey =
  | "external_id"
  | "title"
  | "manufacturer"
  | "model"
  | "vehicle_generation"
  | "year"
  | "oem_number"
  | "price"
  | "condition"
  | "warehouse_location"
  | "image_url";

type ImportSource = "ovoko" | "other";
type RowFilter = "all" | "valid" | "invalid";

type FieldDefinition = {
  key: FieldKey;
  label: string;
  required?: boolean;
};

type PreparedRow = {
  rowIndex: number;
  rowNumber: number;
  externalId: string;
  title: string;
  manufacturer: string;
  model: string;
  vehicleGeneration: string;
  year: number | null;
  oemNumber: string;
  price: number | null;
  condition: string;
  warehouseLocation: string;
  imageUrl: string;
  errors: string[];
};

type SkippedRow = {
  rowNumber: number;
  externalId: string;
  title: string;
  internalCode: string;
  reason: string;
};

type ImportReport = {
  imported: number;
  skipped: number;
  failed: number;
  details: string[];
  skippedRows: SkippedRow[];
};

const FIELDS: FieldDefinition[] = [
  { key: "external_id", label: "RRR / Ovoko detalės ID", required: true },
  { key: "title", label: "Detalės pavadinimas", required: true },
  { key: "manufacturer", label: "Automobilio markė" },
  { key: "model", label: "Automobilio modelis" },
  { key: "vehicle_generation", label: "Automobilio karta" },
  { key: "year", label: "Automobilio metai" },
  { key: "oem_number", label: "OEM numeris" },
  { key: "price", label: "Kaina", required: true },
  { key: "condition", label: "Būklė" },
  { key: "warehouse_location", label: "Sandėlio vieta" },
  { key: "image_url", label: "Nuotraukos nuoroda" },
];

const ALIASES: Record<FieldKey, string[]> = {
  external_id: [
    "id", "part id", "product id", "listing id", "external id",
    "rrr id", "ovoko id", "detales id", "prekės id", "prekes id",
  ],
  title: [
    "title", "name", "part name", "product name",
    "pavadinimas", "detale", "detalė", "preke", "prekė",
  ],
  manufacturer: [
    "manufacturer", "make", "brand", "car make",
    "marke", "markė", "gamintojas",
  ],
  model: ["model", "car model", "modelis"],
  vehicle_generation: ["generation", "vehicle generation", "karta"],
  year: ["year", "car year", "manufacture year", "metai"],
  oem_number: [
    "oem", "oem number", "part number", "original number", "oem numeris",
  ],
  price: ["price", "sale price", "kaina", "price eur"],
  condition: ["condition", "bukle", "būklė"],
  warehouse_location: [
    "location", "warehouse", "warehouse location",
    "sandelys", "sandėlys", "sandėlio vieta",
  ],
  image_url: [
    "image", "image url", "photo", "photo url",
    "nuotrauka", "nuotraukos nuoroda",
  ],
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-./]+/g, " ")
    .replace(/\s+/g, " ");
}

function guessMappings(headers: string[]): Record<FieldKey, string> {
  const result = {} as Record<FieldKey, string>;
  const used = new Set<string>();

  for (const field of FIELDS) {
    const aliases = ALIASES[field.key].map(normalize);

    const match = headers.find(
      (header) =>
        !used.has(header) && aliases.includes(normalize(header))
    );

    result[field.key] = match ?? "";

    if (match) used.add(match);
  }

  return result;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parsePrice(value: string): number | null {
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/€/g, "")
    .replace(",", ".");

  if (!cleaned) return null;

  const number = Number(cleaned);

  if (!Number.isFinite(number) || number < 0) return null;

  return number;
}

function parseYear(value: string): number | null {
  if (!value.trim()) return null;

  const year = Number(value.trim());

  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year > new Date().getFullYear() + 1
  ) {
    return null;
  }

  return year;
}

function normalizeCondition(value: string): string {
  const normalized = normalize(value);

  if (["new", "nauja", "naujas"].includes(normalized)) {
    return "new";
  }

  if (["used", "naudota", "naudotas"].includes(normalized)) {
    return "used";
  }

  return "";
}

function getMappedValue(
  row: DataRow,
  mapping: Record<FieldKey, string>,
  field: FieldKey
): string {
  const column = mapping[field];
  return column ? row[column]?.trim() ?? "" : "";
}

function isDuplicateError(error: { code?: string }): boolean {
  return error.code === "23505";
}

export default function ImportPage() {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<DataRow[]>([]);

  const [mapping, setMapping] = useState<Record<FieldKey, string>>(
    {} as Record<FieldKey, string>
  );

  const [source, setSource] = useState<ImportSource>("ovoko");
  const [defaultCondition, setDefaultCondition] = useState("Naudota");
  const [filter, setFilter] = useState<RowFilter>("all");

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [error, setError] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  function reset() {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({} as Record<FieldKey, string>);
    setFilter("all");
    setError("");
    setReport(null);
    setShowSkipped(false);
  }

  function loadData(
    rawHeaders: string[],
    rawRows: DataRow[],
    name: string
  ) {
    const cleanedHeaders = rawHeaders
      .map((header) => header.trim())
      .filter(Boolean);

    if (!cleanedHeaders.length) {
      throw new Error("Faile nerasta stulpelių.");
    }

    if (!rawRows.length) {
      throw new Error("Faile nerasta duomenų eilučių.");
    }

    if (new Set(cleanedHeaders).size !== cleanedHeaders.length) {
      throw new Error(
        "Faile yra pasikartojančių stulpelių pavadinimų."
      );
    }

    setHeaders(cleanedHeaders);
    setRows(rawRows);
    setMapping(guessMappings(cleanedHeaders));
    setFileName(name);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    reset();
    setLoading(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "csv") {
        const text = await file.text();

        const result = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: "greedy",
          transformHeader: (header) => header.trim(),
        });

        if (result.errors.length > 0) {
          throw new Error(
            "CSV skaitymo klaida: " + result.errors[0].message
          );
        }

        const csvHeaders = result.meta.fields ?? [];

        const csvRows: DataRow[] = result.data.map((row) => {
          const converted: DataRow = {};

          for (const header of csvHeaders) {
            converted[header] = cellToString(row[header]);
          }

          return converted;
        });

        loadData(csvHeaders, csvRows, file.name);
      } else if (extension === "xlsx" || extension === "xls") {
        const buffer = await file.arrayBuffer();

        const workbook = XLSX.read(buffer, {
          type: "array",
          cellDates: false,
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          throw new Error("Excel faile nerasta darbalapių.");
        }

        const sheet = workbook.Sheets[firstSheetName];

        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: "",
          raw: false,
        });

        if (matrix.length < 2) {
          throw new Error("Excel faile nepakanka duomenų.");
        }

        const excelHeaders = matrix[0].map(cellToString);

        const excelRows: DataRow[] = matrix
          .slice(1)
          .filter((row) =>
            row.some((cell) => cellToString(cell) !== "")
          )
          .map((row) => {
            const converted: DataRow = {};

            excelHeaders.forEach((header, index) => {
              if (header) {
                converted[header] = cellToString(row[index]);
              }
            });

            return converted;
          });

        loadData(excelHeaders, excelRows, file.name);
      } else {
        throw new Error("Pasirink CSV, XLSX arba XLS failą.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nepavyko perskaityti failo."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function updateMapping(field: FieldKey, column: string) {
    setMapping((current) => ({
      ...current,
      [field]: column,
    }));

    setReport(null);
    setShowSkipped(false);
  }

  function updateCell(
    rowIndex: number,
    field: FieldKey,
    value: string
  ) {
    const column = mapping[field];

    if (!column) return;

    setRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? { ...row, [column]: value }
          : row
      )
    );

    setReport(null);
    setShowSkipped(false);
  }

  const preparedRows = useMemo<PreparedRow[]>(() => {
    const seenIds = new Set<string>();

    return rows.map((row, index) => {
      const externalId = getMappedValue(
        row,
        mapping,
        "external_id"
      );

      const title = getMappedValue(row, mapping, "title");

      const manufacturer = getMappedValue(
        row,
        mapping,
        "manufacturer"
      );

      const model = getMappedValue(row, mapping, "model");

      const vehicleGeneration = getMappedValue(
        row,
        mapping,
        "vehicle_generation"
      );

      const yearText = getMappedValue(row, mapping, "year");

      const oemNumber = getMappedValue(
        row,
        mapping,
        "oem_number"
      );

      const priceText = getMappedValue(row, mapping, "price");

      const conditionText = getMappedValue(
        row,
        mapping,
        "condition"
      );

      const warehouseLocation = getMappedValue(
        row,
        mapping,
        "warehouse_location"
      );

      const imageUrl = getMappedValue(
        row,
        mapping,
        "image_url"
      );

      const price = parsePrice(priceText);
      const year = parseYear(yearText);

      const condition = normalizeCondition(
        conditionText || defaultCondition
      );

      const errors: string[] = [];

      if (!externalId) {
        errors.push("Nėra originalaus detalės ID");
      } else if (seenIds.has(externalId)) {
        errors.push("Pasikartojantis ID šiame faile");
      } else {
        seenIds.add(externalId);
      }

      if (!title) {
        errors.push("Nėra detalės pavadinimo");
      }

      if (price === null) {
        errors.push("Neteisinga arba tuščia kaina");
      }

      if (!condition) {
        errors.push("Neteisinga detalės būklė");
      }

      if (yearText && year === null) {
        errors.push("Neteisingi automobilio metai");
      }

      return {
        rowIndex: index,
        rowNumber: index + 2,
        externalId,
        title,
        manufacturer,
        model,
        vehicleGeneration,
        year,
        oemNumber,
        price,
        condition,
        warehouseLocation,
        imageUrl,
        errors,
      };
    });
  }, [rows, mapping, defaultCondition]);

  const mappedFields = useMemo(
    () => FIELDS.filter((field) => Boolean(mapping[field.key])),
    [mapping]
  );

  const missingRequired = FIELDS.filter(
    (field) => field.required && !mapping[field.key]
  );

  const duplicateMappings = useMemo(() => {
    const selected = Object.values(mapping).filter(Boolean);

    return selected.filter(
      (value, index) => selected.indexOf(value) !== index
    );
  }, [mapping]);

  const validCount = preparedRows.filter(
    (row) => row.errors.length === 0
  ).length;

  const invalidCount = preparedRows.length - validCount;

  const filteredRows = useMemo(() => {
    if (filter === "valid") {
      return preparedRows.filter(
        (row) => row.errors.length === 0
      );
    }

    if (filter === "invalid") {
      return preparedRows.filter(
        (row) => row.errors.length > 0
      );
    }

    return preparedRows;
  }, [preparedRows, filter]);

  const canImport =
    !loading &&
    !importing &&
    rows.length > 0 &&
    missingRequired.length === 0 &&
    duplicateMappings.length === 0 &&
    invalidCount === 0;

  async function handleImport() {
    if (!canImport) {
      setError("Pirmiausia ištaisyk importavimo klaidas.");
      return;
    }

    const confirmed = window.confirm(
      `Ar tikrai nori importuoti ${preparedRows.length} detales?\n\n` +
        "Duomenys bus įrašyti į tikrą Supabase duomenų bazę."
    );

    if (!confirmed) return;

    setImporting(true);
    setError("");
    setReport(null);
    setShowSkipped(false);

    const result: ImportReport = {
      imported: 0,
      skipped: 0,
      failed: 0,
      details: [],
      skippedRows: [],
    };

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Norint importuoti detales, reikia prisijungti."
        );
      }

      const sellerId = user.id;
      const seenIds = new Set<string>();

      for (const row of preparedRows) {
        const duplicateKey = `${source}:${row.externalId}`;

        if (seenIds.has(duplicateKey)) {
          result.skipped++;

          result.skippedRows.push({
            rowNumber: row.rowNumber,
            externalId: row.externalId,
            title: row.title,
            internalCode: "—",
            reason: "Pasikartojantis ID faile",
          });

          result.details.push(
            `Eilutė ${row.rowNumber}: pasikartojantis ID faile (${row.externalId}).`
          );

          continue;
        }

        seenIds.add(duplicateKey);

        const {
          data: existing,
          error: checkError,
        } = await supabase
          .from("listings")
          .select("id, internal_code, title")
          .eq("seller_id", sellerId)
          .eq("external_source", source)
          .eq("external_id", row.externalId)
          .limit(1);

        if (checkError) {
          result.failed++;

          result.details.push(
            `Eilutė ${row.rowNumber}: nepavyko patikrinti dublikato – ${checkError.message}`
          );

          continue;
        }

        if (existing && existing.length > 0) {
          result.skipped++;

          const found = existing[0];

          result.skippedRows.push({
            rowNumber: row.rowNumber,
            externalId: row.externalId,
            title: found.title || row.title,
            internalCode: found.internal_code || "—",
            reason: "Detalė jau importuota",
          });

          result.details.push(
            `Eilutė ${row.rowNumber}: detalė jau importuota (${row.externalId}).`
          );

          continue;
        }

        const payload = {
          seller_id: sellerId,
          external_source: source,
          external_id: row.externalId,
          title: row.title,
          price: row.price,
          category: "car",
          condition: row.condition,
          manufacturer: row.manufacturer || null,
          model: row.model || null,
          vehicle_generation: row.vehicleGeneration || null,
          year: row.year,
          oem_number: row.oemNumber || null,
          warehouse_location: row.warehouseLocation || null,
          status: "active",
        };

        const { error: insertError } = await supabase
          .from("listings")
          .insert(payload);

        if (insertError) {
          if (isDuplicateError(insertError)) {
            result.skipped++;

            const { data: duplicate } = await supabase
              .from("listings")
              .select("internal_code, title")
              .eq("seller_id", sellerId)
              .eq("external_source", source)
              .eq("external_id", row.externalId)
              .limit(1);

            result.skippedRows.push({
              rowNumber: row.rowNumber,
              externalId: row.externalId,
              title: duplicate?.[0]?.title || row.title,
              internalCode:
                duplicate?.[0]?.internal_code || "—",
              reason: "Dublikatas duomenų bazėje",
            });

            result.details.push(
              `Eilutė ${row.rowNumber}: dublikatas (${row.externalId}).`
            );
          } else {
            result.failed++;

            result.details.push(
              `Eilutė ${row.rowNumber}: ${insertError.message}`
            );
          }

          continue;
        }

        result.imported++;
      }

      setReport(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Importuojant įvyko klaida."
      );

      if (
        result.imported ||
        result.skipped ||
        result.failed
      ) {
        setReport(result);
      }
    } finally {
      setImporting(false);
    }
  }

  const inputClass =
    "w-full min-w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-teal-600 focus:outline-none";

  return (
    <main
      className="min-h-screen px-4 py-10"
      style={{ backgroundColor: "#F5F7F6" }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p
            className="mb-2 text-sm font-semibold"
            style={{ color: "#426A70" }}
          >
            AUTO MOTO DALYS
          </p>

          <h1
            className="text-3xl font-bold"
            style={{ color: "#24333D" }}
          >
            Detalių importavimas
          </h1>

          <p className="mt-3 text-gray-600">
            Įkelk CSV arba Excel failą, patikrink duomenis
            ir ištaisyk klaidas prieš importuodamas.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xl font-bold text-gray-800">
            1. Pasirink failą
          </h2>

          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition hover:bg-gray-50"
            style={{ borderColor: "#426A70" }}
          >
            <span className="mb-3 text-4xl">📂</span>

            <span className="font-semibold text-gray-800">
              {loading
                ? "Skaitomas failas..."
                : "Paspausk ir pasirink CSV arba Excel failą"}
            </span>

            <span className="mt-2 text-sm text-gray-500">
              Palaikomi formatai: .csv, .xlsx, .xls
            </span>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFile}
              disabled={loading || importing}
              className="hidden"
            />
          </label>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {fileName && (
            <div className="mt-4 rounded-lg bg-green-50 p-4 text-green-800">
              <p className="font-semibold">
                ✅ Failas perskaitytas
              </p>

              <p className="mt-1">Failas: {fileName}</p>
              <p>Rasta eilučių: {rows.length}</p>
              <p>Rasta stulpelių: {headers.length}</p>
            </div>
          )}
        </section>

        {headers.length > 0 && (
          <>
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-bold text-gray-800">
                2. Importavimo nustatymai
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Duomenų šaltinis
                  </label>

                  <select
                    value={source}
                    onChange={(event) => {
                      setSource(
                        event.target.value as ImportSource
                      );
                      setReport(null);
                      setShowSkipped(false);
                    }}
                    disabled={importing}
                    className={inputClass}
                  >
                    <option value="ovoko">RRR / Ovoko</option>
                    <option value="other">Kita sistema</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Numatytoji detalės būklė
                  </label>

                  <select
                    value={defaultCondition}
                    onChange={(event) => {
                      setDefaultCondition(event.target.value);
                      setReport(null);
                      setShowSkipped(false);
                    }}
                    disabled={importing}
                    className={inputClass}
                  >
                    <option value="Naudota">Naudota</option>
                    <option value="Nauja">Nauja</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-xl font-bold text-gray-800">
                3. Susiek stulpelius
              </h2>

              <p className="mb-6 text-sm text-gray-600">
                Pasirink, kuris failo stulpelis atitinka
                kiekvieną AUTO MOTO DALYS lauką.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      {field.label}

                      {field.required && (
                        <span className="ml-1 text-red-500">
                          *
                        </span>
                      )}
                    </label>

                    <select
                      value={mapping[field.key] ?? ""}
                      onChange={(event) =>
                        updateMapping(
                          field.key,
                          event.target.value
                        )
                      }
                      disabled={importing}
                      className={inputClass}
                    >
                      <option value="">
                        — Nepasirinkta —
                      </option>

                      {headers.map((header, index) => (
                        <option
                          key={`${header}-${index}`}
                          value={header}
                        >
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {missingRequired.length > 0 && (
                <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  ⚠️ Būtina susieti originalų detalės ID,
                  pavadinimą ir kainą.
                </p>
              )}

              {duplicateMappings.length > 0 && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  ⚠️ Tas pats failo stulpelis pasirinktas
                  keliems laukams.
                </p>
              )}
            </section>

            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-xl font-bold text-gray-800">
                4. Detalių patikrinimas ir taisymas
              </h2>

              <p className="mb-5 text-sm text-gray-600">
                Paspausk statistikos kortelę, kad matytum
                norimas detales. Lentelėje gali taisyti
                duomenis tiesiogiai.
              </p>

              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    filter === "all"
                      ? "border-[#426A70] bg-teal-50"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <p className="text-sm text-gray-600">
                    Visos detalės
                  </p>

                  <p className="mt-1 text-3xl font-bold text-gray-800">
                    {preparedRows.length}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Rodyti visas
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("valid")}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    filter === "valid"
                      ? "border-green-600 bg-green-50"
                      : "border-gray-200 bg-green-50/50 hover:bg-green-50"
                  }`}
                >
                  <p className="text-sm text-green-700">
                    Tinkamos
                  </p>

                  <p className="mt-1 text-3xl font-bold text-green-800">
                    {validCount}
                  </p>

                  <p className="mt-2 text-xs text-green-700">
                    Be klaidų
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("invalid")}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    filter === "invalid"
                      ? "border-red-600 bg-red-50"
                      : "border-gray-200 bg-red-50/50 hover:bg-red-50"
                  }`}
                >
                  <p className="text-sm text-red-700">
                    Su klaidomis
                  </p>

                  <p className="mt-1 text-3xl font-bold text-red-800">
                    {invalidCount}
                  </p>

                  <p className="mt-2 text-xs text-red-700">
                    Paspausk ir pataisyk
                  </p>
                </button>
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Rodoma:{" "}
                  <strong>{filteredRows.length}</strong>
                  {" "}iš{" "}
                  <strong>{preparedRows.length}</strong>
                  {" "}detalių
                </p>

                {filter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Rodyti visas
                  </button>
                )}
              </div>

              {filteredRows.length === 0 ? (
                <div className="rounded-xl bg-gray-50 p-6 text-center text-gray-600">
                  {filter === "invalid"
                    ? "✅ Šiuo metu nėra detalių su klaidomis."
                    : filter === "valid"
                    ? "Šiuo metu nėra tinkamų detalių."
                    : "Nėra duomenų."}
                </div>
              ) : (
                <div className="max-h-[600px] overflow-auto rounded-xl border border-gray-200">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-gray-100">
                      <tr>
                        <th className="whitespace-nowrap border-b px-3 py-3">
                          Eilutė
                        </th>

                        {mappedFields.map((field) => (
                          <th
                            key={field.key}
                            className="whitespace-nowrap border-b px-3 py-3"
                          >
                            {field.label}
                          </th>
                        ))}

                        <th className="min-w-64 border-b px-3 py-3">
                          Patikrinimas
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((prepared) => (
                        <tr
                          key={prepared.rowIndex}
                          className={`border-b ${
                            prepared.errors.length > 0
                              ? "bg-red-50/40"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="whitespace-nowrap px-3 py-3 font-semibold text-gray-700">
                            {prepared.rowNumber}
                          </td>

                          {mappedFields.map((field) => (
                            <td
                              key={field.key}
                              className="min-w-44 px-2 py-2"
                            >
                              <input
                                type="text"
                                value={
                                  rows[prepared.rowIndex]?.[
                                    mapping[field.key]
                                  ] ?? ""
                                }
                                onChange={(event) =>
                                  updateCell(
                                    prepared.rowIndex,
                                    field.key,
                                    event.target.value
                                  )
                                }
                                disabled={importing}
                                aria-label={`${field.label}, eilutė ${prepared.rowNumber}`}
                                className={inputClass}
                              />
                            </td>
                          ))}

                          <td className="min-w-64 px-3 py-3">
                            {prepared.errors.length === 0 ? (
                              <span className="font-semibold text-green-700">
                                ✅ Tinka
                              </span>
                            ) : (
                              <div className="space-y-1">
                                {prepared.errors.map(
                                  (message, index) => (
                                    <p
                                      key={index}
                                      className="text-sm font-medium text-red-700"
                                    >
                                      ❌ {message}
                                    </p>
                                  )
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-3 text-xs text-gray-500">
                Pataisymai išsaugomi tik šiame importavimo
                puslapyje. Originalus CSV / Excel failas
                kompiuteryje nekeičiamas.
              </p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-800">
                5. Importavimas į AUTO MOTO DALYS
              </h2>

              <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                ℹ️ Naujiems skelbimams Supabase automatiškai
                sugeneruos AMD kodus. Jau importuoti RRR /
                Ovoko ID bus praleisti.
              </div>

              {invalidCount > 0 && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  ⚠️ Dar yra {invalidCount} detalių su
                  klaidomis. Paspausk kortelę „Su klaidomis“
                  ir jas pataisyk.
                </div>
              )}

              <button
                type="button"
                onClick={handleImport}
                disabled={!canImport}
                className="mt-5 rounded-xl px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "#426A70" }}
              >
                {importing
                  ? "Importuojama..."
                  : `Importuoti ${validCount} detales į AUTO MOTO DALYS`}
              </button>

              {report && (
                <div className="mt-6 rounded-xl border border-gray-200 p-5">
                  <h3 className="mb-4 text-lg font-bold text-gray-800">
                    Importavimo ataskaita
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-green-50 p-4">
                      <p className="text-sm text-green-700">
                        Importuota
                      </p>

                      <p className="text-2xl font-bold text-green-800">
                        {report.imported}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowSkipped((current) => !current)
                      }
                      className={`rounded-lg border-2 p-4 text-left transition ${
                        showSkipped
                          ? "border-amber-500 bg-amber-100"
                          : "border-transparent bg-amber-50 hover:bg-amber-100"
                      }`}
                    >
                      <p className="text-sm text-amber-700">
                        Praleista
                      </p>

                      <p className="text-2xl font-bold text-amber-800">
                        {report.skipped}
                      </p>

                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        {showSkipped
                          ? "▲ Paslėpti dublikatus"
                          : "▼ Peržiūrėti dublikatus"}
                      </p>
                    </button>

                    <div className="rounded-lg bg-red-50 p-4">
                      <p className="text-sm text-red-700">
                        Klaidos
                      </p>

                      <p className="text-2xl font-bold text-red-800">
                        {report.failed}
                      </p>
                    </div>
                  </div>

                  {showSkipped && (
                    <div className="mt-5">
                      <h4 className="mb-3 text-lg font-bold text-gray-800">
                        Praleistų detalių sąrašas
                        {" "}({report.skippedRows.length})
                      </h4>

                      {report.skippedRows.length === 0 ? (
                        <p className="rounded-lg bg-gray-50 p-4 text-gray-600">
                          Praleistų detalių nėra.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                          <table className="min-w-full text-left text-sm">
                            <thead className="bg-amber-50 text-gray-700">
                              <tr>
                                <th className="px-4 py-3">
                                  Eilutė
                                </th>
                                <th className="px-4 py-3">
                                  RRR / Ovoko ID
                                </th>
                                <th className="px-4 py-3">
                                  Detalė
                                </th>
                                <th className="px-4 py-3">
                                  AMD kodas
                                </th>
                                <th className="px-4 py-3">
                                  Priežastis
                                </th>
                                <th className="px-4 py-3">
                                  Veiksmas
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {report.skippedRows.map(
                                (item, index) => (
                                  <tr
                                    key={`${item.externalId}-${index}`}
                                    className="border-t hover:bg-gray-50"
                                  >
                                    <td className="px-4 py-3">
                                      {item.rowNumber}
                                    </td>

                                    <td className="px-4 py-3 font-semibold">
                                      {item.externalId}
                                    </td>

                                    <td className="px-4 py-3">
                                      {item.title}
                                    </td>

                                    <td className="px-4 py-3 font-semibold text-teal-700">
                                      {item.internalCode}
                                    </td>

                                    <td className="px-4 py-3 text-amber-800">
                                      {item.reason}
                                    </td>

                                    <td className="px-4 py-3">
                                      <a
                                        href="/my-listings"
                                        className="font-semibold text-teal-700 underline hover:text-teal-900"
                                      >
                                        Mano skelbimai
                                      </a>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <p className="mt-3 text-xs text-gray-500">
                        Praleistos detalės neimportuojamos
                        antrą kartą. AMD kodas rodomas,
                        jeigu detalė jau rasta duomenų bazėje.
                      </p>
                    </div>
                  )}

                  {report.details.length > 0 && (
                    <div className="mt-4 max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4">
                      <h4 className="mb-3 font-semibold text-gray-800">
                        Importavimo pranešimai
                      </h4>

                      {report.details.map((detail, index) => (
                        <p
                          key={index}
                          className="mb-2 text-sm text-gray-700"
                        >
                          {detail}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}