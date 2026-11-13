import Link from "next/link";

// AUTO_MOTO_PRIVACY_PAGE_V1

export const metadata = {
  title: "Privatumas | AUTO MOTO DALYS",
  description: "Informacija apie AUTO MOTO DALYS privatumo ir naršyklės saugyklos naudojimą.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-2xl border border-[#E3E9E7] bg-white p-6 shadow-sm md:p-10">
        <Link
          href="/"
          className="text-sm font-semibold text-[#426A70] hover:underline"
        >
          ← Grįžti į pradžią
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-[#24333D]">
          Privatumas ir naršyklės duomenys
        </h1>

        <p className="mt-4 text-slate-700">
          AUTO MOTO DALYS siekia aiškiai informuoti lankytojus apie
          duomenų naudojimą. Šiame puslapyje aprašomos šiuo metu
          projekte nustatytos naršyklės saugojimo funkcijos.
        </p>

        <h2 className="mt-8 text-xl font-bold text-[#24333D]">
          Prisijungimas
        </h2>
        <p className="mt-3 text-slate-700">
          Platformoje naudojama Supabase autentifikavimo sistema.
          Prisijungimo sesijai palaikyti gali būti saugomi
          autentifikavimo duomenys naršyklėje.
        </p>

        <h2 className="mt-8 text-xl font-bold text-[#24333D]">
          Neseniai peržiūrėti skelbimai
        </h2>
        <p className="mt-3 text-slate-700">
          Naršyklės vietinėje saugykloje (localStorage) saugomi iki
          20 paskutinių atidarytų skelbimų identifikatorių.
          Ši istorija išlieka toje pačioje naršyklėje ir
          nepriklauso nuo prisijungimo.
        </p>
        <p className="mt-3 text-slate-700">
          Istoriją galima pašalinti puslapyje{" "}
          <Link
            href="/recently-viewed"
            className="font-semibold text-[#426A70] underline"
          >
            Neseniai peržiūrėti
          </Link>
          .
        </p>

        <h2 className="mt-8 text-xl font-bold text-[#24333D]">
          Skelbimų naršymo būsena
        </h2>
        <p className="mt-3 text-slate-700">
          Platforma gali naudoti sessionStorage ir localStorage
          tam tikriems naršymo nustatymams išsaugoti, pavyzdžiui,
          skelbimų sąrašo būsenai.
        </p>

        <h2 className="mt-8 text-xl font-bold text-[#24333D]">
          Analitika ir reklama
        </h2>
        <p className="mt-3 text-slate-700">
          Atliekant pirminę projekto kodo patikrą, žinomų
          reklamos sekimo ar lankytojų analitikos įrankių
          neaptikta. Šis patikrinimas neapima visų galimų
          išorinių paslaugų ir naršyklės užklausų.
        </p>

        <h2 className="mt-8 text-xl font-bold text-[#24333D]">
          Duomenų valdymas
        </h2>
        <p className="mt-3 text-slate-700">
          Neseniai peržiūrėtų skelbimų istoriją galima išvalyti
          pačioje platformoje. Kitus vietinius svetainės
          duomenis galima tvarkyti naršyklės nustatymuose,
          tačiau jų ištrynimas gali nutraukti prisijungimo sesiją
          arba panaikinti išsaugotus naršymo nustatymus.
        </p>

        <p className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-500">
          Tai preliminari informacija apie techninį duomenų
          saugojimą. Prieš viešą platformos paleidimą privatumo
          dokumentas turi būti papildytas duomenų valdytojo
          kontaktais, duomenų tvarkymo tikslais, teisiniais
          pagrindais, saugojimo terminais ir kitomis taikytinomis
          privatumo nuostatomis.
        </p>
      </article>
    </main>
  );
}