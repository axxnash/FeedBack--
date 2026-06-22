import { useEffect, useMemo, useState } from "react";
import logo from "../assets/logo.png";
import NotificationBell from "./NotificationBell";
import { clearAuth, getCurrentUserFromStorage } from "../lib/auth";
import { navigateTo } from "../lib/navigation";

const ghostButtonClassName =
  "rounded-full border border-[#e2e7d8] bg-white/85 px-5 py-2 font-label-md text-label-md text-[#415041] shadow-[0_8px_20px_rgba(104,97,59,0.05)] transition-all hover:border-[#b9d48f] hover:bg-[#f7fbf1]";
const primaryButtonClassName =
  "rounded-full bg-[#eef7e3] px-4 py-2 font-label-md text-label-md text-primary transition-all hover:bg-[#fff1d6] hover:text-[#FFA02E]";

export default function Navbar() {
  const currentUser = getCurrentUserFromStorage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const closeMenu = () => setMobileMenuOpen(false);

    window.addEventListener("popstate", closeMenu);
    window.addEventListener("authchange", closeMenu);

    return () => {
      window.removeEventListener("popstate", closeMenu);
      window.removeEventListener("authchange", closeMenu);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    setMobileMenuOpen(false);
    navigateTo("/");
  };

  const roleButtons = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    const buttons = [];

    if (["INDIVIDUAL", "NGO"].includes(currentUser.role)) {
      buttons.push(
        { label: "Marketplace", path: "/marketplace" },
        { label: "Track Orders", path: "/marketplace/orders" }
      );
    }

    if (["VENDOR", "MERCHANT"].includes(currentUser.role)) {
      buttons.push(
        { label: "Create Listing", path: "/vendor/dashboard" },
        { label: "My Listings", path: "/vendor/listings" },
        { label: "Order History", path: "/vendor/orders" }
      );
    }

    if (currentUser.role === "RIDER") {
      buttons.push(
        { label: "Delivery Jobs", path: "/rider/dashboard" },
        { label: "Delivery History", path: "/rider/history" },
        { label: "Wallet", path: "/rider/wallet" }
      );
    }

    buttons.push({ label: "My Account", path: "/me" });

    if (currentUser.role === "ADMIN") {
      buttons.push(
        { label: "Admin Control Panel", path: "/admin/dashboard" },
        { label: "Approvals", path: "/admin/approvals" }
      );
    }

    return buttons;
  }, [currentUser]);

  const guestButtons = [
    { label: "Login", path: "/login", variant: "ghost" },
    { label: "Sign Up", path: "/register", variant: "primary" }
  ];

  const renderNavButton = (button, fullWidth = false) => (
    <button
      key={button.label}
      type="button"
      onClick={() => {
        setMobileMenuOpen(false);
        navigateTo(button.path);
      }}
      className={`${button.variant === "primary" ? primaryButtonClassName : ghostButtonClassName} ${
        fullWidth ? "w-full text-left" : ""
      }`}
    >
      {button.label}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8eddc] bg-[linear-gradient(180deg,rgba(255,252,238,0.98)_0%,rgba(248,249,244,0.96)_100%)] backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigateTo("/");
            }}
            className="group flex min-w-0 items-center gap-3"
          >
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,168,57,0.24)_0%,rgba(255,168,57,0)_70%)] blur-md" />
              <img
                src={logo}
                alt="Feedback logo"
                className="relative h-12 w-12 rounded-full border-4 border-surface-container-lowest bg-surface-container-lowest object-cover shadow-[0_14px_30px_rgba(104,97,59,0.14)] transition-transform duration-300 group-hover:scale-[1.03] sm:h-16 sm:w-16"
              />
            </div>
            <span className="truncate font-display text-[1.4rem] text-primary transition-colors hover:text-[#FFA02E] sm:text-h2">
              FeedBack
            </span>
          </button>

          <div className="hidden flex-wrap items-center justify-end gap-3 lg:flex">
            {currentUser ? (
              <>
                <NotificationBell />
                {roleButtons.map((button) => renderNavButton(button))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className={primaryButtonClassName}
                >
                  Logout
                </button>
              </>
            ) : (
              guestButtons.map((button) => renderNavButton(button))
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {currentUser ? <NotificationBell /> : null}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe7d2] bg-white/90 text-[#415041] shadow-[0_8px_20px_rgba(104,97,59,0.05)] transition hover:bg-[#f7fbf1]"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="animate-in mt-4 rounded-[1.75rem] border border-[#e4ead9] bg-white/95 p-4 shadow-[0_22px_40px_rgba(104,97,59,0.08)] lg:hidden">
            <div className="flex flex-col gap-3">
              {currentUser ? (
                <>
                  <div className="rounded-2xl border border-[#edf3e4] bg-[#fafdf6] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b8975]">
                      Signed in
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#243625]">
                      {currentUser.name || currentUser.email}
                    </p>
                    <p className="text-xs text-[#63705f]">{currentUser.role}</p>
                  </div>
                  {roleButtons.map((button) => renderNavButton(button, true))}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`${primaryButtonClassName} w-full text-left`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                guestButtons.map((button) => renderNavButton(button, true))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
