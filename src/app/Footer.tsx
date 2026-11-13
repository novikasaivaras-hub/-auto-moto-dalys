"use client";

import { useEffect, useState } from "react";

// AUTO_MOTO_FOOTER_YEAR_V2
function FooterYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <span>{year ?? ""}</span>;
}
import Link from "next/link";

// AUTO_MOTO_FOOTER_V1

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E3E9E7] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6">
        <p className="text-sm text-slate-600">
          © <FooterYear /> AUTO MOTO DALYS
        </p>

        <nav aria-label="Svetainės apačios navigacija">
          <Link
            href="/privacy"
            className="text-sm font-semibold text-[#426A70] hover:underline"
          >
            Privatumas
          </Link>
        </nav>
      </div>
    </footer>
  );
}