"use client";

import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

interface NavbarProps {
  isScrolled: boolean;
  activeSection: string;
  onNavClick: (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => void;
}

export default function Navbar({ isScrolled, activeSection, onNavClick }: NavbarProps) {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-[#3a3a3a] ${
        isScrolled ? "bg-background/95 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex items-center">
        {}
        <div className="flex-1 flex justify-start">
          <div className="flex items-center gap-3">
            <Image
              src="/monetalogo.png"
              alt="Moneta"
              width={40}
              height={40}
              priority
            />
            <span className="text-sidebar-title text-[#E7E4E4]">MONETA</span>
          </div>
        </div>

        {}
        <nav className="hidden md:flex items-center gap-8">
          {["home", "features", "about", "contact"].map((section) => (
            <a
              key={section}
              href={`#${section}`}
              onClick={(e) => onNavClick(e, section)}
              className={`text-body font-semibold transition-colors capitalize ${
                activeSection === section ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              {section}
            </a>
          ))}
        </nav>

        {}
        <div className="flex-1 flex justify-end items-center gap-4">
          <ClerkLoading>
            <button
              type="button"
              className="flex items-center justify-center h-9 sm:h-10 min-w-[120px] sm:min-w-[140px] rounded-full bg-gradient-to-b from-[#AC66DA] to-[#904eb8] text-[#E7E4E4] font-semibold text-sm sm:text-base border border-[#AC66DA]/50 shadow-[0_4px_12px_rgba(172,102,218,0.2)] cursor-pointer"
            >
              Get Started
            </button>
          </ClerkLoading>
          <ClerkLoaded>
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center h-9 sm:h-10 min-w-[120px] sm:min-w-[140px] px-5 rounded-full bg-[#E7E4E4] text-[#282828] font-semibold text-body hover:opacity-90 transition-opacity"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Open</span>
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8 sm:w-10 sm:h-10",
                      userButtonPopoverCard: "bg-[#282828] border border-[#3a3a3a]",
                      userButtonPopoverActionButton: "text-[#E7E4E4] hover:bg-[#3a3a3a]",
                      userButtonPopoverActionButtonText: "text-[#E7E4E4]",
                    },
                  }}
                />
              </div>
            </SignedIn>
            <SignedOut>
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button
                  type="button"
                  className="flex items-center justify-center h-9 sm:h-10 min-w-[120px] sm:min-w-[140px] rounded-full bg-gradient-to-b from-[#AC66DA] to-[#904eb8] text-[#E7E4E4] font-semibold hover:opacity-90 transition-all text-sm sm:text-base border border-[#AC66DA]/50 shadow-[0_4px_12px_rgba(172,102,218,0.2)] hover:scale-[1.02] cursor-pointer"
                >
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
          </ClerkLoaded>
        </div>
      </div>
    </header>
  );
}
