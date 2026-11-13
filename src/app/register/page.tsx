
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/login`,
    }});

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Registracija sėkminga! Patikrink savo el. paštą, jei reikia patvirtinti paskyrą."
      );
    }

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-lg"
      >
        <h1 className="text-3xl font-black text-slate-900">
          Sukurk paskyrą
        </h1>

        <p className="text-slate-500">
          Prisijunk prie AUTO MOTO DALYS prekyvietės.
        </p>

        <div>
          <label className="mb-2 block font-semibold">El. paštas</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tavo@email.com"
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label className="mb-2 block font-semibold">Slaptažodis</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mažiausiai 6 simboliai"
            className="w-full rounded-lg border p-3"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-orange-500 p-3 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Registruojama..." : "Registruotis"}
        </button>

        {message && (
          <p className="text-sm text-slate-700">{message}</p>
        )}
      </form>
    </main>
  );
}
