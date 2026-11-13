
import Link from "next/link";

const categories = [
  {
    name: "Automobiliai",
    description: "Atrask savo kitą automobilį",
    image:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1000&q=85",
    href: "/listings?category=car&sale_type=vehicle",
  },
  {
    name: "Motociklai",
    description: "Laisvė prasideda nuo dviejų ratų",
    image:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1000&q=85",
    href: "/listings?category=motorcycle&sale_type=vehicle",
  },
  {
    name: "Automobilių dalys",
    description: "Viskas tavo automobiliui",
    image:
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1000&q=85",
    href: "/listings?category=car&sale_type=part",
  },
  {
    name: "Motociklų dalys",
    description: "Detalės kiekvienai kelionei",
    image:
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1000&q=85",
    href: "/listings?category=motorcycle&sale_type=part",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F5F7F6]">
      {/* KOMPAKTIŠKA PAIEŠKOS ZONA */}
      <section className="bg-[#24333D] px-4 py-8 text-center text-white sm:py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
            Automobiliai, motociklai ir jų dalys
          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-sm text-[#D7E6E4] sm:text-base">
            Pirk ir parduok lengvai – viskas vienoje vietoje.
          </p>

          <form
            action="/listings"
            method="get"
            className="mx-auto mt-5 flex max-w-3xl flex-col gap-2 rounded-xl bg-white p-2 shadow-lg sm:flex-row"
          >
            <input
              type="search"
              name="q"
              placeholder="Ieškok detalės, OEM kodo, automobilio ar pardavėjo"
              className="min-w-0 flex-1 rounded-lg border border-[#E3E9E7] px-4 py-3 text-base sm:text-sm text-[#24333D] outline-none focus:border-[#426A70]"
            />

            <button
              type="submit"
              className="rounded-lg bg-[#426A70] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#35565B]"
            >
              Ieškoti
            </button>
          </form>
        </div>
      </section>

      {/* KATEGORIJOS */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black text-[#24333D] sm:text-3xl">
              Ką ieškai?
            </h2>

            <p className="mt-1 text-sm text-[#64748B]">
              Pasirink kategoriją ir pradėk paiešką.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group overflow-hidden rounded-2xl border border-[#E3E9E7] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#426A70] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#426A70]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#E9EFED]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={category.image}
                  alt={category.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>

              <div className="px-3 py-4 text-center sm:px-4">
                <h3 className="text-base font-black text-[#24333D] sm:text-lg">
                  {category.name}
                </h3>

                <p className="mt-1 text-xs text-[#64748B] sm:text-sm">
                  {category.description}
                </p>

                <span className="mt-3 inline-block text-xs font-bold text-[#426A70] sm:text-sm">
                  Peržiūrėti →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* PARDAVĖJO KVETIMAS */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#E3E9E7] bg-white px-6 py-6 text-center shadow-sm sm:flex-row sm:text-left">
          <div>
            <h2 className="text-xl font-black text-[#24333D]">
              Turi ką parduoti?
            </h2>

            <p className="mt-1 text-sm text-[#64748B]">
              Įdėk automobilio, motociklo ar detalės skelbimą.
            </p>
          </div>

          <Link
            href="/sell"
            className="shrink-0 rounded-lg bg-[#426A70] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#35565B]"
          >
            + Įdėti skelbimą
          </Link>
        </div>
      </section>
    </main>
  );
}
