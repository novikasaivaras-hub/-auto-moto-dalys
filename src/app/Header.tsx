
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  // AUTO_MOTO_MOBILE_MENU_V1
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!userId) {
      setCartCount(0);
      return;
    }

    let active = true;
    let busy = false;

    async function refreshCartCount() {
      if (!active || busy) return;
      busy = true;

      try {
        const { count, error } = await supabase
          .from("cart_items")
          .select("id", { count: "exact", head: true })
          .eq("buyer_id", userId);

        if (!error && active) {
          setCartCount(count ?? 0);
        }
      } finally {
        busy = false;
      }
    }

    void refreshCartCount();

    const interval = setInterval(() => {
      void refreshCartCount();
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId, pathname]);
  const loadUnreadCount = useCallback(async (currentUserId: string) => {
    const { data: conversations, error: conversationError } =
      await supabase
        .from("conversations")
        .select("id")
        .or(
          `buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`
        );

    if (conversationError) {
      console.error(
        "Nepavyko gauti pokalbių:",
        conversationError.message
      );
      return;
    }

    const conversationIds = (conversations ?? []).map(
      (conversation) => conversation.id
    );

    if (conversationIds.length === 0) {
      setUnreadCount(0);
      return;
    }

    const { count, error: messageError } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .neq("sender_id", currentUserId)
      .is("read_at", null);

    if (messageError) {
      console.error(
        "Nepavyko suskaičiuoti neperskaitytų žinučių:",
        messageError.message
      );
      return;
    }

    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    let active = true;

    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!active) return;

      setUserId(data.user?.id ?? null);
      setLoading(false);
    }

    void checkUser();

    const { data: authListener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;

        setUserId(session?.user?.id ?? null);
        setUnreadCount(0);
        setLoading(false);
      });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    let requestInProgress = false;

    async function refreshUnread() {
      if (!active || requestInProgress) return;

      requestInProgress = true;

      try {
        await loadUnreadCount(userId!);
      } finally {
        requestInProgress = false;
      }
    }

    void refreshUnread();

    const interval = setInterval(() => {
      void refreshUnread();
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId, loadUnreadCount, pathname]);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Nepavyko atsijungti. Bandykite dar kartą.");
      setSigningOut(false);
      return;
    }

    setUserId(null);
    setUnreadCount(0);
    setSigningOut(false);

    router.push("/");
    router.refresh();
  }

  function navClass(href: string) {
    const selected =
      href === "/"
        ? pathname === "/"
        : pathname === href ||
          pathname.startsWith(`${href}/`);

    return selected
      ? "rounded-lg bg-[#426A70] px-3 py-2 text-sm font-semibold text-white"
      : "rounded-lg px-3 py-2 text-sm font-semibold text-[#24333D] hover:bg-[#E6EFEE]";
  }

  return (
    <header className="border-b border-[#E3E9E7] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="text-xl font-black tracking-tight text-[#24333D]"
        >
          <span className="text-[#426A70]">AUTO</span>{" "}
          MOTO DALYS
        </Link>

        <button
          type="button"
          aria-label={mobileMenuOpen ? "Uždaryti meniu" : "Atidaryti meniu"}
          aria-expanded={mobileMenuOpen}
          aria-controls="auto-moto-main-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="inline-flex items-center justify-center rounded-lg border border-[#E3E9E7] px-3 py-2 text-xl text-[#24333D] md:hidden"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>

        <nav
          id="auto-moto-main-navigation"
          aria-label="Pagrindinė navigacija"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) {
              setMobileMenuOpen(false);
            }
          }}
          className={`${
            mobileMenuOpen ? "flex" : "hidden"
          } w-full flex-col items-stretch gap-2 md:flex md:w-auto md:flex-row md:flex-wrap md:items-center`}
        >
          <Link href="/" className={navClass("/")}>
            Pradžia
          </Link>

          <Link
            href="/listings"
            className={navClass("/listings")}
          >
            Skelbimai
          </Link>

          {/* AUTO_MOTO_RECENT_NAV_V1 */}
          <Link
            href="/recently-viewed"
            className={navClass("/recently-viewed")}
          >
            🕘 Neseniai peržiūrėti
          </Link>
          <Link href="/sell" className={navClass("/sell")}>
            Parduoti detalę
          </Link>

          {!loading && userId && (
            <>
              <Link
                href="/my-listings"
                className={navClass("/my-listings")}
              >
                📦 Mano skelbimai
              </Link>

              <Link
                href="/favorites"
                className={navClass("/favorites")}
              >
                ❤️ Mano mėgstami
              </Link>

              <Link
                href="/cart"
                className={navClass("/cart")}
              >
                <span className="inline-flex items-center gap-2">
                  <span>🛒 Krepšelis</span>
                  {cartCount > 0 && (
                    <span
                      aria-label={`${cartCount} prekių krepšelyje`}
                      className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#426A70] px-1.5 py-0.5 text-xs font-bold text-white"
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
              </Link>

              <Link
                href="/messages"
                className={navClass("/messages")}
              >
                <span className="inline-flex items-center gap-2">
                  <span>💬 Žinutės</span>

                  {unreadCount > 0 && (
                    <span
                      aria-label={`${unreadCount} neperskaitytų žinučių`}
                      className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
              </Link>

              <Link
                href="/profile"
                className={navClass("/profile")}
              >
                Mano profilis
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="rounded-lg border border-[#E3E9E7] px-3 py-2 text-sm font-semibold text-[#24333D] hover:bg-[#E6EFEE] disabled:opacity-50"
              >
                {signingOut
                  ? "Atsijungiama..."
                  : "Atsijungti"}
              </button>
            </>
          )}

          {!loading && !userId && (
            <>
              <Link
                href="/login"
                className={navClass("/login")}
              >
                Prisijungti
              </Link>

              <Link
                href="/register"
                className="rounded-lg bg-[#426A70] px-3 py-2 text-sm font-semibold text-white hover:bg-[#35565B]"
              >
                Registruotis
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
