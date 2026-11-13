
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Conversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
};

type Listing = {
  id: string;
  title: string;
  price: number;
};

type ConversationItem = Conversation & {
  listing: Listing | null;
  unreadCount: number;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let requestInProgress = false;

    async function loadConversations(initial = false) {
      if (requestInProgress) return;
      requestInProgress = true;

      if (initial) {
        setLoading(true);
        setError("");
      }

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (cancelled) return;

        if (authError || !authData.user) {
          setUserId("");
          setConversations([]);
          setError("Norėdami matyti žinutes, prisijunkite.");
          return;
        }

        const currentUserId = authData.user.id;
        setUserId(currentUserId);

        const { data, error: conversationsError } = await supabase
          .from("conversations")
          .select("id, listing_id, buyer_id, seller_id")
          .or(
            `buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`
          );

        if (conversationsError) throw conversationsError;

        const rows = (data ?? []) as Conversation[];

        const items = await Promise.all(
          rows.map(async (conversation): Promise<ConversationItem> => {
            const [listingResult, unreadResult] = await Promise.all([
              supabase
                .from("listings")
                .select("id, title, price")
                .eq("id", conversation.listing_id)
                .maybeSingle(),
              supabase
                .from("messages")
                .select("id", { count: "exact", head: true })
                .eq("conversation_id", conversation.id)
                .neq("sender_id", currentUserId)
                .is("read_at", null),
            ]);

            if (unreadResult.error) throw unreadResult.error;

            return {
              ...conversation,
              listing: (listingResult.data as Listing | null) ?? null,
              unreadCount: unreadResult.count ?? 0,
            };
          })
        );

        if (cancelled) return;

        setConversations(items);
        setError("");
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Nepavyko įkelti pokalbių."
          );
        }
      } finally {
        requestInProgress = false;

        if (!cancelled && initial) {
          setLoading(false);
        }
      }
    }

    void loadConversations(true);

    const interval = setInterval(() => {
      void loadConversations();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const totalUnread = conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-[#426A70] hover:underline"
          >
            ← Grįžti į pradžią
          </Link>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#24333D]">
            Mano žinutės
            {totalUnread > 0 && (
              <span className="ml-3 inline-flex min-w-8 items-center justify-center rounded-full bg-[#426A70] px-2 py-1 align-middle text-sm font-bold text-white">
                {totalUnread}
              </span>
            )}
          </h1>

          <p className="mt-2 text-[#64748B]">
            Visi pokalbiai su pirkėjais ir pardavėjais vienoje vietoje.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-[#E3E9E7] bg-white p-8 text-[#64748B]">
            Įkeliami pokalbiai...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            <p>{error}</p>

            {!userId && (
              <Link
                href="/login"
                className="mt-4 inline-block rounded-xl bg-[#426A70] px-5 py-3 font-semibold text-white hover:bg-[#35565B]"
              >
                Prisijungti
              </Link>
            )}
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="rounded-2xl border border-[#E3E9E7] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mb-4 text-4xl">💬</div>

            <h2 className="text-xl font-semibold text-[#24333D]">
              Pokalbių dar nėra
            </h2>

            <p className="mx-auto mt-3 max-w-md text-[#64748B]">
              Kai susisieksite su pardavėju arba pirkėjas parašys jums,
              pokalbis atsiras čia.
            </p>

            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-[#426A70] px-6 py-3 font-semibold text-white transition hover:bg-[#35565B]"
            >
              Naršyti skelbimus
            </Link>
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[#E3E9E7] bg-white shadow-sm">
            {conversations.map((conversation, index) => {
              const isSeller = conversation.seller_id === userId;

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className={`flex items-center gap-4 px-5 py-5 transition hover:bg-[#F5F7F6] ${
                    index > 0 ? "border-t border-[#E3E9E7]" : ""
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6EFEE] text-xl text-[#426A70]">
                    💬
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-[#24333D]">
                      {conversation.listing?.title ??
                        "Pokalbis apie skelbimą"}
                    </h2>

                    <p className="mt-1 text-sm text-[#64748B]">
                      {isSeller
                        ? "Jūs esate pardavėjas"
                        : "Jūs esate pirkėjas"}
                    </p>

                    {conversation.listing && (
                      <p className="mt-1 text-sm font-medium text-[#426A70]">
                        {Number(conversation.listing.price).toFixed(2)} €
                      </p>
                    )}
                  </div>

                  {conversation.unreadCount > 0 && (
                    <span
                      aria-label={`${conversation.unreadCount} neperskaitytų žinučių`}
                      className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-[#426A70] px-2 text-sm font-bold text-white"
                    >
                      {conversation.unreadCount}
                    </span>
                  )}

                  <span
                    aria-hidden="true"
                    className="text-xl text-[#8A9A9D]"
                  >
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
