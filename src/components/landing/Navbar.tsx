"use client";

import Image from "next/image";
import { SignedIn, UserButton, ClerkLoaded } from "@clerk/nextjs";
import { useLandingScroll } from "@/hooks/useLandingScroll";
import { cx } from "@/components/ui/cx";
import AuthCta from "./AuthCta";

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export default function Navbar() {
  const { isScrolled, activeSection, handleNavClick } = useLandingScroll();

  return (
    <header
      className={cx(
        "fixed left-0 right-0 top-0 z-50 border-b border-line transition-[background-color,backdrop-filter] duration-300",
        isScrolled ? "bg-background/95 backdrop-blur-sm" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center px-6 py-6 md:px-8">
        <div className="flex flex-1 justify-start">
          <a href="#home" onClick={(e) => handleNavClick(e, "home")} className="flex items-center gap-3">
            <Image src="/monetalogo.png" alt="" width={40} height={40} priority />
            <span className="text-sidebar-title text-fg">MONETA</span>
          </a>
        </div>

        <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => handleNavClick(e, section.id)}
                aria-current={isActive ? "location" : undefined}
                className={cx(
                  "text-copy font-semibold transition-colors",
                  isActive ? "text-accent-fg" : "text-fg hover:text-accent-fg",
                )}
              >
                {section.label}
              </a>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-4">
          <AuthCta
            className="h-10 min-w-[120px] px-5 text-ui sm:min-w-[140px] sm:text-copy"
            signedInLabel={
              <>
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Open</span>
              </>
            }
          />
          <ClerkLoaded>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 sm:w-10 sm:h-10",
                    userButtonPopoverCard: "bg-surface-1 border border-line",
                    userButtonPopoverActionButton: "text-fg hover:bg-surface-3",
                    userButtonPopoverActionButtonText: "text-fg",
                  },
                }}
              />
            </SignedIn>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  );
}
