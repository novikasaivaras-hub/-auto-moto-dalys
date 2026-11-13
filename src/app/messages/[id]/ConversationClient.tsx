
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PartPriceOffersPanel from "@/components/PartPriceOffersPanel";

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

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Props = {
  conversationId: string;
};

export default function ConversationClient({
  conversationId,
}: Props) {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [conversation, setConversation] =
    useState<Conversation | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const markAsRead = useCallback(async () => {
    const { error: readError } = await supabase.rpc(
      "mark_conversation_read",
      { p_conversation_id: conversationId }
    );

    if (readError) {
      console.error(
        "Nepavyko pažymėti žinučių perskaitytomis:",
        readError.message
      );
    }
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    const { data, error: messageError } = await supabase
      .from("messages")
      .select(
        "id, conversation_id, sender_id, content, created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!messageError) {
      setMessages((data ?? []) as Message[]);
      void markAsRead();
    }
  }, [conversationId, markAsRead]);

  useEffect(() => {
    let cancelled = false;

    async function loadConversation() {
      try {
        const { data: authData } =
          await supabase.auth.getUser();

        if (cancelled) return;

        if (!authData.user) {
          router.replace("/login");
          return;
        }

        const currentUserId = authData.user.id;
        setUserId(currentUserId);

        const { data, error: conversationError } =
          await supabase
            .from("conversations")
            .select("id, listing_id, buyer_id, seller_id")
            .eq("id", conversationId)
            .single();

        if (cancelled) return;

        if (conversationError || !data) {
          setError(
            "Pokalbis nerastas arba neturite prieigos."
          );
          return;
        }

        const currentConversation = data as Conversation;

        if (
          currentConversation.buyer_id !== currentUserId &&
          currentConversation.seller_id !== currentUserId
        ) {
          setError(
            "Neturite teisės peržiūrėti šio pokalbio."
          );
          return;
        }

        setConversation(currentConversation);

        const [listingResult, messagesResult] =
          await Promise.all([
            supabase
              .from("listings")
              .select("id, title, price")
              .eq("id", currentConversation.listing_id)
              .maybeSingle(),
            supabase
              .from("messages")
              .select(
                "id, conversation_id, sender_id, content, created_at"
              )
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: true }),
          ]);

        if (cancelled) return;

        setListing(
          (listingResult.data as Listing | null) ?? null
        );

        if (messagesResult.error) {
          setError("Nepavyko įkelti žinučių.");
        } else {
          setMessages(
            (messagesResult.data ?? []) as Message[]
          );
          void markAsRead();
        }
      } catch {
        if (!cancelled) {
          setError("Nepavyko įkelti pokalbio.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (conversationId) {
      void loadConversation();
    } else {
      setLoading(false);
      setError("Nenurodytas pokalbio ID.");
    }

    return () => {
      cancelled = true;
    };
  }, [conversationId, router, markAsRead]);

  useEffect(() => {
    if (!conversation || !userId) return;

    const interval = setInterval(() => {
      void loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [conversation, userId, loadMessages]);

  async function sendMessage(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const content = draft.trim();

    if (!content || !conversation || !userId || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const { error: sendError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_id: userId,
          content,
        });

      if (sendError) {
        setError("Nepavyko išsiųsti žinutės.");
        return;
      }

      setDraft("");
      await loadMessages();
    } catch {
      setError("Nepavyko išsiųsti žinutės.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7F6] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/messages"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#426A70] transition hover:text-[#35565B]"
        >
          <span aria-hidden="true">←</span>
          Visi pokalbiai
        </Link>

        {loading && (
          <div className="rounded-2xl border border-[#E3E9E7] bg-white p-8 text-[#64748B] shadow-sm">
            Įkeliamas pokalbis...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {!loading && conversation && (
          <div className="overflow-hidden rounded-2xl border border-[#E3E9E7] bg-white shadow-sm">
            <div className="border-b border-[#E3E9E7] bg-[#FBFCFB] px-5 py-6 sm:px-7">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#72868A]">
                Pokalbis apie skelbimą
              </p>

              <h1 className="text-xl font-bold leading-snug text-[#24333D] sm:text-2xl">
                {listing?.title ?? "Skelbimas"}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {listing && (
                  <span className="rounded-lg bg-[#E6EFEE] px-3 py-1.5 text-sm font-bold text-[#35565B]">
                    {Number(listing.price).toFixed(2)} €
                  </span>
                )}

                <span className="text-sm text-[#64748B]">
                  {conversation.seller_id === userId
                    ? "Jūs esate pardavėjas"
                    : "Jūs esate pirkėjas"}
                </span>
              </div>

              {listing && (
                <Link
                  href={`/listings/${listing.id}`}
                  className="mt-4 inline-block text-sm font-semibold text-[#426A70] hover:underline"
                >
                  Peržiūrėti skelbimą →
                </Link>
              )}
            </div>

            {listing && (
              <PartPriceOffersPanel
                listingId={listing.id}
                userId={userId}
                buyerId={conversation.buyer_id}
                isSeller={conversation.seller_id === userId}
              />
            )}
            <div className="flex min-h-80 flex-col gap-4 bg-white px-4 py-6 sm:px-7">
              {messages.length === 0 && (
                <div className="my-auto py-10 text-center">
                  <div className="mb-3 text-3xl">💬</div>

                  <p className="font-semibold text-[#24333D]">
                    Pokalbis dar neprasidėjo
                  </p>

                  <p className="mt-2 text-sm text-[#64748B]">
                    Parašykite pirmąją žinutę.
                  </p>
                </div>
              )}

              {messages.map((message) => {
                const mine = message.sender_id === userId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      mine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                        mine
                          ? "rounded-br-md bg-[#426A70] text-white"
                          : "rounded-bl-md border border-[#E3E9E7] bg-[#F5F7F6] text-[#24333D]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed sm:text-base">
                        {message.content}
                      </p>

                      <p
                        className={`mt-2 text-right text-xs ${
                          mine
                            ? "text-[#D7E6E4]"
                            : "text-[#819095]"
                        }`}
                      >
                        {new Date(
                          message.created_at
                        ).toLocaleString("lt-LT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={sendMessage}
              className="flex flex-col gap-3 border-t border-[#E3E9E7] bg-[#FBFCFB] p-4 sm:flex-row sm:items-center sm:p-6"
            >
              <label htmlFor="message-draft" className="sr-only">
                Jūsų žinutė
              </label>

              <input
                id="message-draft"
                type="text"
                value={draft}
                onChange={(event) =>
                  setDraft(event.target.value)
                }
                placeholder="Parašykite žinutę..."
                maxLength={2000}
                className="min-w-0 flex-1 rounded-xl border border-[#D6DFDC] bg-white px-4 py-3 text-[#24333D] outline-none transition placeholder:text-[#9AA6A7] focus:border-[#426A70] focus:ring-2 focus:ring-[#426A70]/15"
              />

              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="rounded-xl bg-[#426A70] px-6 py-3 font-semibold text-white transition hover:bg-[#35565B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Siunčiama..." : "Siųsti"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
