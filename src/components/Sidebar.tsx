"use client";

import Image from "next/image";
import {
  Home,
  Wallet,
  PiggyBank,
  LotOfCash,
  BitcoinCircle,
  CalendarCheck,
  Reports,
  Settings,
  Bell,
  HeadsetHelp,
  Crown,
  LogOut,
  SunLight,
  HalfMoon,
  SidebarCollapse,
} from "iconoir-react";

interface SidebarProps {
  activeSection?: string;
}

export default function Sidebar({ activeSection = "dashboard" }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, href: "/" },
    { id: "income", label: "Income", icon: Wallet, href: "/income" },
    { id: "expenses", label: "Expenses", icon: PiggyBank, href: "/expenses" },
    { id: "transactions", label: "Transactions", icon: LotOfCash, href: "/transactions" },
    { id: "investments", label: "Investments", icon: BitcoinCircle, href: "/investments" },
    { id: "goals", label: "Goals", icon: CalendarCheck, href: "/goals" },
    { id: "statistics", label: "Statistics", icon: Reports, href: "/statistics" },
  ];

  const generalItems = [
    { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
    { id: "updates", label: "Updates", icon: Bell, href: "/updates" },
    { id: "help", label: "Help Center", icon: HeadsetHelp, href: "/help" },
    { id: "pricing", label: "Pricing", icon: Crown, href: "/pricing" },
  ];

  return (
    <aside className="sidebar">
      {/* Logo and Collapse Button */}
      <div className="sidebar-logo">
        <Image src="/monetalogo.png" alt="Moneta" width={32} height={32} priority />
        <span className="text-sidebar-button">MONETA</span>
        <button type="button" aria-label="Collapse sidebar">
          <SidebarCollapse width={20} height={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* MENU Section */}
      <h2 className="text-sidebar-section sidebar-section-title">MENU</h2>
      <nav>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`sidebar-nav-item ${activeSection === item.id ? "active" : ""}`}
            >
              <Icon width={20} height={20} strokeWidth={1.5} />
              <span className="text-sidebar-button">{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* GENERAL Section */}
      <h2 className="text-sidebar-section sidebar-section-title">GENERAL</h2>
      <nav>
        {generalItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`sidebar-nav-item ${activeSection === item.id ? "active" : ""}`}
            >
              <Icon width={20} height={20} strokeWidth={1.5} />
              <span className="text-sidebar-button">{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Footer with Log Out and Theme Toggle */}
      <div className="sidebar-footer">
        <button type="button" className="sidebar-logout">
          <LogOut width={20} height={20} strokeWidth={1.5} />
          <span className="text-sidebar-button">Log Out</span>
        </button>

        <div className="theme-toggle">
          <button type="button" className="theme-toggle-button active" aria-label="Light mode">
            <SunLight width={20} height={20} strokeWidth={1.5} />
          </button>
          <button type="button" className="theme-toggle-button" aria-label="Dark mode">
            <HalfMoon width={20} height={20} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}

