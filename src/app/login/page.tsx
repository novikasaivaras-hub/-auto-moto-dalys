
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message === "Invalid login credentials") {
        setMessage("Neteisingas el. paštas arba slaptažodis. Patikrink duomenis ir bandyk dar kartą.");
      } else if (error.message === "Email not confirmed") {
        setMessage("El. paštas dar nepatvirtintas. Patikrink savo el. pašto dėžutę.");
      } else {
        setMessage("Prisijungti nepavyko. Bandyk dar kartą.");
      }

      setLoading(false);
      return;
    }

    router.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-lg"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Prisijungimas
          </h1>
          <p className="mt-2 text-slate-500">
            Prisijunk prie AUTO MOTO DALYS.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block font-semibold text-slate-700">
            El. paštas
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            placeholder="tavo@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block font-semibold text-slate-700">
            Slaptažodis
          </label>

          <div className="flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-w-0 flex-1 p-3 outline-none"
              placeholder="Tavo slaptažodis"
            />

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}
              title={showPassword ? "Slėpti slaptažodį" : "Rodyti slaptažodį"}
              className="flex items-center justify-center border-l border-slate-300 bg-slate-100 px-4 text-slate-700 hover:bg-slate-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {showPassword ? (
                  <>
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 9 5 9 7a9.5 9.5 0 0 1-2 3" />
                    <path d="M6.2 6.2C3.7 7.8 2 10.3 2 12c0 2 4 7 10 7a10 10 0 0 0 4-.8" />
                  </>
                ) : (
                  <>
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {message && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 p-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Jungiamasi..." : "Prisijungti"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Neturi paskyros?{" "}
          <Link href="/register" className="font-bold text-orange-600 hover:text-orange-700">
            Registruokis
          </Link>
        </p>

        <p className="text-center text-sm">
          <Link href="/" className="text-slate-500 hover:text-orange-600">
            ← Grįžti į pagrindinį puslapį
          </Link>
        </p>
      </form>
    </main>
  );
}
