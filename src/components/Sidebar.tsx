"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  HomeSimpleDoor,
  Wallet,
  ShoppingBag,
  LotOfCash,
  BitcoinCircle,
  CalendarCheck,
  Reports,
  LogOut,
  NavArrowRight,
  NavArrowLeft,
} from "iconoir-react";
import { ClerkLoaded, ClerkLoading, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
 

interface SidebarProps {
  activeSection?: string;
}

const COLLAPSED_STORAGE_KEY = "moneta.sidebarCollapsed";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: HomeSimpleDoor, href: "/dashboard" },
  { id: "income", label: "Income", icon: Wallet, href: "/income" },
  { id: "expenses", label: "Expenses", icon: ShoppingBag, href: "/expenses" },
  { id: "transactions", label: "Transactions", icon: LotOfCash, href: "/transactions" },
  { id: "investments", label: "Investments", icon: BitcoinCircle, href: "/investments" },
  { id: "goals", label: "Goals", icon: CalendarCheck, href: "/goals" },
  { id: "statistics", label: "Statistics", icon: Reports, href: "/statistics" },
];

export default function Sidebar({ activeSection }: SidebarProps) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const currentActiveSection = activeSection ?? sectionForPath(pathname);
  const isCollapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", isCollapsed);
  }, [isCollapsed]);

  const toggleCollapse = () => writeCollapsed(!isCollapsed);

  return (
    <aside className="sidebar">
      {}
      <div className="sidebar-logo">
        <Link href={isSignedIn ? "/dashboard" : "/"} className="sidebar-brand" aria-label={isSignedIn ? "Moneta, go to dashboard" : "Moneta, go to home page"}>
          <Image src="/monetalogo.png" alt="" width={48} height={48} priority />
          {!isCollapsed && <span className="sidebar-title">MONETA</span>}
        </Link>
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          className="collapse-btn"
          onClick={toggleCollapse}
        >
          {isCollapsed ? (
            <NavArrowRight width={20} height={20} strokeWidth={1.5} />
          ) : (
            <NavArrowLeft width={20} height={20} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {}
      <div className="sidebar-scroll">
        <nav aria-label="Main">
          <ul>
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentActiveSection === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={isCollapsed ? item.label : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  >
                    <Icon width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
                    {!isCollapsed && <span className="text-sidebar-button truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>



      {}
      <div className="sidebar-footer">
        <ClerkLoading>
          <div className="sidebar-logout pointer-events-none" aria-hidden="true">
            <div className="sidebar-account-avatar-slot">
              <div className="w-full h-full rounded-full bg-surface-3 animate-pulse" />
            </div>
            {!isCollapsed && (
              <span className="text-sidebar-button">Account</span>
            )}
          </div>
        </ClerkLoading>
        <ClerkLoaded>
          <SignedIn>
            {/* The UserButton inside is the keyboard control; clicking the row label forwards to it. */}
            <div
              className="sidebar-logout"
              onClick={(e) => {
                const trigger = (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('.sidebar-account-avatar-slot button');
                if (trigger && !(e.target as HTMLElement).closest('.sidebar-account-avatar-slot button')) {
                  trigger.click();
                }
              }}
            >
              <div className="sidebar-account-avatar-slot">
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "!w-5 !h-5 min-w-5 min-h-5",
                      userButtonPopoverCard: "bg-surface-1 border border-line",
                      userButtonPopoverActionButton: "text-fg hover:bg-surface-3",
                      userButtonPopoverActionButtonText: "text-fg",
                      userButtonPopoverFooter: "hidden",
                    },
                  }}
                />
              </div>
              {!isCollapsed && (
                <span className="text-sidebar-button">Account</span>
              )}
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button" className="sidebar-logout">
                <LogOut width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
                {!isCollapsed && (
                  <span className="text-sidebar-button">Sign In</span>
                )}
              </button>
            </SignInButton>
          </SignedOut>
        </ClerkLoaded>
      </div>
    </aside>
  );
}

/** Sidebar section for the current route; nested routes (e.g. /investments/42) keep their parent active. */
function sectionForPath(pathname: string): string | null {
  const match = MENU_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.id ?? null;
}

// Collapsed state lives in localStorage; useSyncExternalStore reads it after hydration so the server
// render (always expanded) and the first client render match.
const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(listener: () => void): () => void {
  collapsedListeners.add(listener);
  return () => collapsedListeners.delete(listener);
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCollapsed(next: boolean) {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
  } catch {
    // Storage can be blocked (private mode); the sidebar then stays expanded.
  }
  collapsedListeners.forEach((listener) => listener());
}
