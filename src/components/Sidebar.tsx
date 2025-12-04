"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  HomeSimpleDoor,
  Wallet,
  ShoppingBag,
  LotOfCash,
  BitcoinCircle,
  CalendarCheck,
  Reports,
  LogOut,
  SunLight,
  HalfMoon,
  NavArrowRight,
  NavArrowLeft,
} from "iconoir-react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';

interface SidebarProps {
  activeSection?: string;
}

export default function Sidebar({ activeSection }: SidebarProps) {
  const pathname = usePathname();
  
  // Determine active section from pathname if not provided
  const getActiveSection = () => {
    if (activeSection) return activeSection;
    
    // Don't highlight sidebar items when on settings, help, or other non-main pages
    if (pathname === "/settings" || pathname === "/help" || pathname.startsWith("/help")) {
      return null;
    }
    
    if (pathname === "/dashboard") return "dashboard";
    if (pathname === "/income") return "income";
    if (pathname === "/expenses") return "expenses";
    if (pathname === "/transactions") return "transactions";
    if (pathname === "/investments") return "investments";
    if (pathname === "/goals") return "goals";
    if (pathname === "/statistics") return "statistics";
    
    return null; // default - no active section for unknown pages
  };
  
  const currentActiveSection = getActiveSection();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("moneta.sidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });
  const [isLightActive, setIsLightActive] = useState<boolean>(true);

  // Sync body class with collapsed state
  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", isCollapsed);
  }, [isCollapsed]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem("moneta.sidebarCollapsed", String(next));
    } catch {}
  };
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: HomeSimpleDoor, href: "/dashboard", comingSoon: false },
    { id: "income", label: "Income", icon: Wallet, href: "/income", comingSoon: false },
    { id: "expenses", label: "Expenses", icon: ShoppingBag, href: "/expenses", comingSoon: false },
    { id: "transactions", label: "Transactions", icon: LotOfCash, href: "/transactions", comingSoon: false },
    { id: "investments", label: "Investments", icon: BitcoinCircle, href: "/investments", comingSoon: true },
    { id: "goals", label: "Goals", icon: CalendarCheck, href: "/goals", comingSoon: true },
    { id: "statistics", label: "Statistics", icon: Reports, href: "/statistics", comingSoon: false },
  ];

  return (
    <aside className="sidebar">
      {/* Logo and Collapse Button */}
      <div className="sidebar-logo">
        <Link href="/" className="sidebar-brand" aria-label="Go to dashboard">
          <Image src="/monetalogo.png" alt="Moneta" width={48} height={48} priority />
          {!isCollapsed && <span className="sidebar-title">MONETA</span>}
        </Link>
        <button type="button" aria-label="Collapse sidebar" className="collapse-btn" onClick={toggleCollapse}>
          {isCollapsed ? (
            <NavArrowRight width={20} height={20} strokeWidth={1.5} />
          ) : (
            <NavArrowLeft width={20} height={20} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Scrollable MENU area */}
      <div className="sidebar-scroll">
        <nav>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`sidebar-nav-item ${currentActiveSection === item.id ? "active" : ""}`}
              >
                <Icon width={20} height={20} strokeWidth={1.5} />
                {!isCollapsed && (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sidebar-button truncate">{item.label}</span>
                    {item.comingSoon && (
                      <ComingSoonBadge size="sm" />
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer with Auth and Theme Toggle */}
      <div className="sidebar-footer">
        <SignedIn>
          <div className="sidebar-logout">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-5 h-5",
                  userButtonPopoverCard: "bg-[#282828] border border-[#3a3a3a]",
                  userButtonPopoverActionButton: "text-[#E7E4E4] hover:bg-[#3a3a3a]",
                  userButtonPopoverActionButtonText: "text-[#E7E4E4]",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
            {!isCollapsed && (
              <span className="text-sidebar-button">Account</span>
            )}
          </div>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button type="button" className="sidebar-logout">
              <LogOut width={20} height={20} strokeWidth={1.5} />
              {!isCollapsed && (
                <span className="text-sidebar-button">Sign In</span>
              )}
            </button>
          </SignInButton>
        </SignedOut>

        {isCollapsed ? (
          <button
            type="button"
            className="theme-toggle-single"
            aria-label={isLightActive ? "Light mode active" : "Dark mode active"}
            onClick={() => setIsLightActive((v) => !v)}
          >
            <span className={`tt-icon ${isLightActive ? "show" : ""}`}>
              <SunLight width={20} height={20} strokeWidth={1.5} />
            </span>
            <span className={`tt-icon ${!isLightActive ? "show" : ""}`}>
              <HalfMoon width={20} height={20} strokeWidth={1.5} />
            </span>
          </button>
        ) : (
          <div className={`theme-toggle ${isLightActive ? "is-light" : "is-dark"}`}>
            <span className="theme-toggle-indicator" aria-hidden="true" />
            <button
              type="button"
              className={`theme-toggle-button ${isLightActive ? "active" : ""}`}
              aria-label="Light mode"
              onClick={() => setIsLightActive(true)}
            >
              <SunLight width={20} height={20} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className={`theme-toggle-button ${!isLightActive ? "active" : ""}`}
              aria-label="Dark mode"
              onClick={() => setIsLightActive(false)}
            >
              <HalfMoon width={20} height={20} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

