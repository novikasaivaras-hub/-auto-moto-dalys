"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const expectedId = "59553793-9eea-4d39-b6fa-0fd1cc39c183";

export default function AuthCheckPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setLoading(false);
    });
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold">
        Paskyros patikra
      </h1>

      {loading ? (
        <p>Tikrinama...</p>
      ) : (
        <div className="space-y-4">
          <p>
            Svetaines vartotojo ID:
            <br />
            <strong>{userId ?? "Neprisijungta"}</strong>
          </p>

          <p>
            Bandomojo skelbimo savininko ID:
            <br />
            <strong>{expectedId}</strong>
          </p>

          <p className="text-xl font-bold">
            {userId === expectedId
              ? "1 - Paskyros sutampa"
              : "0 - Paskyros nesutampa"}
          </p>
        </div>
      )}
    </main>
  );
}
