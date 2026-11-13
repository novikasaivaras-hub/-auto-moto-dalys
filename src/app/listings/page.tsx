
import { Suspense } from "react";
import ListingsClient from "./ListingsClient";

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 px-4 py-10">
          <div className="mx-auto max-w-6xl">
            <p className="text-lg text-slate-600">
              Įkeliamas skelbimų puslapis...
            </p>
          </div>
        </main>
      }
    >
      <ListingsClient />
    </Suspense>
  );
}
