
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const menuContainerRef = useRef<HTMLElement | null>(null);

  // AUTO_MOTO_MENU_OUTSIDE_V1
  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    <header ref={menuContainerRef} className="relative z-50 border-b border-[#E3E9E7] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="min-w-0 shrink text-sm font-black tracking-tight text-[#24333D] sm:text-xl"
        >
          <span className="text-[#426A70]">AUTO</span>{" "}
          MOTO DALYS
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <Link
            href="/listings"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#24333D] hover:bg-[#E6EFEE] sm:inline-flex"
          >
            Skelbimai
          </Link>

          <Link
            href="/sell"
            className="hidden rounded-lg bg-[#426A70] px-3 py-2 text-xs font-bold text-white hover:bg-[#35565B] sm:inline-flex sm:px-4 sm:text-sm"
          >
            + Įdėti skelbimą
          </Link>

          {/* AUTO_MOTO_HEADER_COUNTERS_V2 */}
          {!loading && userId && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/cart"
                aria-label={`Krepšelis, prekių: ${cartCount}`}
                title="Krepšelis"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl hover:bg-[#E6EFEE]"
              >
                🛒
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#426A70] px-1 text-[10px] font-bold text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              <Link
                href="/messages"
                aria-label={`Žinutės, neperskaitytų: ${unreadCount}`}
                title="Žinutės"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl hover:bg-[#E6EFEE]"
              >
                💬
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          )}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Uždaryti meniu" : "Atidaryti meniu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="auto-moto-main-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E3E9E7] px-3 py-2 text-sm font-semibold text-[#24333D] hover:bg-[#E6EFEE]"
          >
            <span aria-hidden="true">{mobileMenuOpen ? "✕" : "☰"}</span>
            <span className="hidden sm:inline">Meniu</span>
            {(unreadCount > 0 || cartCount > 0) && (
              <span className="h-2 w-2 rounded-full bg-red-600" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav
            id="auto-moto-main-navigation"
            aria-label="Pagrindinė navigacija"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) {
                setMobileMenuOpen(false);
              }
            }}
            className="absolute right-4 top-full z-50 mt-2 flex w-[min(340px,calc(100vw-2rem))] flex-col gap-1 rounded-xl border border-[#E3E9E7] bg-white p-3 shadow-xl"
          >
            <Link href="/" className={navClass("/")}>
              Pradžia
            </Link>

            <Link href="/listings" className={navClass("/listings")}>
              Skelbimai
            </Link>

            <Link href="/sell" className={navClass("/sell")}>
              + Įdėti skelbimą
            </Link>

            <Link
              href="/recently-viewed"
              className={navClass("/recently-viewed")}
            >
              🕘 Neseniai peržiūrėti
            </Link>

            {!loading && userId && (
              <>
                <div className="my-2 border-t border-[#E3E9E7]" />

                <Link href="/my-listings" className={navClass("/my-listings")}>
                  📦 Mano skelbimai
                </Link>

                <Link href="/favorites" className={navClass("/favorites")}>
                  ❤️ Mano mėgstami
                </Link>

                <Link href="/profile" className={navClass("/profile")}>
                  Mano profilis
                </Link>

                <div className="my-2 border-t border-[#E3E9E7]" />

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void handleSignOut();
                  }}
                  disabled={signingOut}
                  className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#64748B] hover:bg-[#E6EFEE] disabled:opacity-50"
                >
                  {signingOut ? "Atsijungiama..." : "Atsijungti"}
                </button>
              </>
            )}

            {!loading && !userId && (
              <>
                <div className="my-2 border-t border-[#E3E9E7]" />

                <Link href="/login" className={navClass("/login")}>
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
        )}
      </div>
    </header>
  );
}



