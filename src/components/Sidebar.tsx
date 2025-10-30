"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  HomeSimpleDoor,
  Wallet,
  ShoppingBag,
  LotOfCash,
  BitcoinCircle,
  CalendarCheck,
  Reports,
  HeadsetHelp,
  LogOut,
  SunLight,
  HalfMoon,
  NavArrowRight,
  NavArrowLeft,
} from "iconoir-react";

interface SidebarProps {
  activeSection?: string;
}

export default function Sidebar({ activeSection = "dashboard" }: SidebarProps) {
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
    { id: "dashboard", label: "Dashboard", icon: HomeSimpleDoor, href: "/" },
    { id: "income", label: "Income", icon: Wallet, href: "/income" },
    { id: "expenses", label: "Expenses", icon: ShoppingBag, href: "/expenses" },
    { id: "transactions", label: "Transactions", icon: LotOfCash, href: "/transactions" },
    { id: "investments", label: "Investments", icon: BitcoinCircle, href: "/investments" },
    { id: "goals", label: "Goals", icon: CalendarCheck, href: "/goals" },
    { id: "statistics", label: "Statistics", icon: Reports, href: "/statistics" },
    { id: "help", label: "Help Center", icon: HeadsetHelp, href: "/help" },
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
              <div
                key={item.id}
                className={`sidebar-nav-item ${activeSection === item.id ? "active" : ""}`}
              >
                <Icon width={20} height={20} strokeWidth={1.5} />
                {!isCollapsed && (
                  <span className="text-sidebar-button">{item.label}</span>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer with Log Out and Theme Toggle */}
      <div className="sidebar-footer">
        <button type="button" className="sidebar-logout">
          <LogOut width={20} height={20} strokeWidth={1.5} />
          <span className="text-sidebar-button">Log Out</span>
        </button>

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

