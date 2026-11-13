"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type PartQrLabelProps = {
  listingId: string;
  internalCode: string;
  title: string;
  manufacturer?: string | null;
  model?: string | null;
  vehicleGeneration?: string | null;
  year?: number | null;
  oemNumber?: string | null;
  warehouseLocation?: string | null;
  condition?: string | null;
};

export default function PartQrLabel({
  listingId,
  internalCode,
  title,
  manufacturer,
  model,
  vehicleGeneration,
  year,
  oemNumber,
  warehouseLocation,
  condition,
}: PartQrLabelProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function generateQr() {
      try {
        setError("");
        setQrDataUrl("");

        // QR visada rodo į tą patį detalės ID.
        // Sandėlio vieta ar detalės būsena gali keistis,
        // bet nuoroda lieka tokia pati.
        const url = `${window.location.origin}/listings/${listingId}`;

        const dataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 360,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        if (active) {
          setQrDataUrl(dataUrl);
        }
      } catch {
        if (active) {
          setError("Nepavyko sugeneruoti QR kodo.");
        }
      }
    }

    if (listingId) {
      void generateQr();
    }

    return () => {
      active = false;
    };
  }, [listingId]);

  function printLabel() {
    if (!qrDataUrl) return;

    const safeCode = internalCode || "AMD";
    const safeTitle = title || "Detalė";

    const vehicle = [
      manufacturer,
      model,
      vehicleGeneration,
      year ? String(year) : "",
    ]
      .filter(Boolean)
      .join(" ");

    // HTML specialiųjų simbolių apsauga.
    function escapeHtml(value: string) {
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    const html = `
      <!DOCTYPE html>
      <html lang="lt">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(safeCode)}</title>
          <style>
            @page {
              size: 100mm 70mm;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #111;
              background: #fff;
            }

            .label {
              width: 100mm;
              height: 70mm;
              padding: 4mm;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }

            .brand {
              font-size: 9pt;
              font-weight: 800;
              letter-spacing: 1px;
            }

            .code {
              margin-top: 2mm;
              font-size: 24pt;
              line-height: 1;
              font-weight: 900;
            }

            .content {
              display: flex;
              gap: 3mm;
              margin-top: 3mm;
              flex: 1;
              min-height: 0;
            }

            .details {
              flex: 1;
              min-width: 0;
              font-size: 9pt;
              overflow-wrap: anywhere;
            }

            .title {
              font-size: 12pt;
              font-weight: 800;
              margin-bottom: 2mm;
            }

            .line {
              margin-bottom: 1.5mm;
            }

            .qr {
              width: 32mm;
              height: 32mm;
              flex-shrink: 0;
              object-fit: contain;
            }

            .footer {
              border-top: 1px solid #111;
              padding-top: 2mm;
              margin-top: 2mm;
              font-size: 8pt;
              font-weight: bold;
            }

            @media print {
              body {
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="brand">AUTO MOTO DALYS</div>

            <div class="code">
              ${escapeHtml(safeCode)}
            </div>

            <div class="content">
              <div class="details">
                <div class="title">
                  ${escapeHtml(safeTitle)}
                </div>

                ${
                  vehicle
                    ? `<div class="line">${escapeHtml(vehicle)}</div>`
                    : ""
                }

                ${
                  oemNumber
                    ? `<div class="line"><b>OEM:</b> ${escapeHtml(
                        oemNumber
                      )}</div>`
                    : ""
                }

                ${
                  warehouseLocation
                    ? `<div class="line"><b>Vieta:</b> ${escapeHtml(
                        warehouseLocation
                      )}</div>`
                    : ""
                }

                ${
                  condition
                    ? `<div class="line"><b>Būklė:</b> ${escapeHtml(
                        condition === "new" ? "Nauja" : "Naudota"
                      )}</div>`
                    : ""
                }
              </div>

              <img
                class="qr"
                src="${qrDataUrl}"
                alt="Detalės QR kodas"
              />
            </div>

            <div class="footer">
              Viena detalė / komplektas – vienas kodas
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    if (!printWindow) {
      setError(
        "Naršyklė užblokavo spausdinimo langą. Leisk iššokančius langus."
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  const vehicleLabel = [
    manufacturer,
    model,
    vehicleGeneration,
    year ? String(year) : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-2xl border border-[#D9E2E0] bg-white p-5">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#426A70]">
          AUTO MOTO DALYS
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-tight text-[#24333D]">
          {internalCode || "AMD"}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2 text-sm text-[#24333D]">
          <p className="text-lg font-bold">{title}</p>

          {vehicleLabel && <p>{vehicleLabel}</p>}

          {oemNumber && (
            <p>
              <strong>OEM:</strong> {oemNumber}
            </p>
          )}

          {warehouseLocation && (
            <p>
              <strong>Sandėlio vieta:</strong>{" "}
              {warehouseLocation}
            </p>
          )}

          {condition && (
            <p>
              <strong>Būklė:</strong>{" "}
              {condition === "new" ? "Nauja" : "Naudota"}
            </p>
          )}
        </div>

        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt={`QR kodas ${internalCode}`}
            className="h-40 w-40 rounded-lg border border-slate-200 bg-white p-1"
          />
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!qrDataUrl}
        onClick={printLabel}
        className="mt-5 w-full rounded-xl bg-[#426A70] px-5 py-3 font-bold text-white hover:bg-[#35565B] disabled:opacity-50"
      >
        🖨️ Spausdinti QR etiketę
      </button>
    </div>
  );
}