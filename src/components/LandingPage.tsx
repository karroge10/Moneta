"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import {
  Spark,
  BitcoinCircle,
  CalendarCheck,
  StatUp,
  CheckCircle,
  HeadsetHelp,
  LotOfCash,
} from "iconoir-react";
import SendFeedbackCard from '@/components/help/SendFeedbackCard';

const CONTACT_EMAIL_FALLBACK = "hello@moneta.app";

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Update active section based on scroll position
      const sections = ["home", "features", "about", "contact"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Call it immediately to set initial state correctly on refresh
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for fixed navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar - Fixed on Scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-[#3a3a3a] ${
          isScrolled ? "bg-background/95 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex items-center">
          {/* Logo Container */}
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

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#home"
              onClick={(e) => handleNavClick(e, "home")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "home" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Home
            </a>
            <a
              href="#features"
              onClick={(e) => handleNavClick(e, "features")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "features" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Features
            </a>
            <a
              href="#about"
              onClick={(e) => handleNavClick(e, "about")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "about" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              About
            </a>
            <a
              href="#contact"
              onClick={(e) => handleNavClick(e, "contact")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "contact" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Contact
            </a>
          </nav>

          {/* Right CTA Container */}
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

      {/* Hero Section */}
      <section
        id="home"
        className="relative pt-28 pb-16 md:pt-36 md:pb-24 px-6 md:px-8 overflow-x-clip"
      >
        {/* Soft ambient background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
        >
          <div className="absolute -top-32 left-1/2 h-[420px] w-[min(90vw,720px)] -translate-x-1/2 rounded-full bg-[#AC66DA]/25 blur-[100px]" />
          <div className="absolute top-1/3 right-0 h-[280px] w-[min(50vw,400px)] translate-x-1/4 rounded-full bg-[#74C648]/10 blur-[90px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-8 md:gap-10">
            {/* Copy */}
            <div className="space-y-8 text-center max-w-5xl mx-auto z-10 pt-8 md:pt-12">
              <h1 className="text-[54px] md:text-[78px] lg:text-[86px] font-bold leading-[1.05] text-[#E7E4E4] tracking-tight">
                <span className="md:whitespace-nowrap">Smart financial dashboard</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#AC66DA] to-[#E7E4E4] pb-2 inline-block">for modern life</span>
              </h1>
              <p className="mx-auto max-w-2xl text-[1.125rem] md:text-[1.25rem] leading-relaxed text-[#E7E4E4]/90 pt-4">
                Manage your money with clear analytics, automated tracking, and personalized insights built for security.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row min-h-[60px]">
                <ClerkLoading>
                  <button
                    type="button"
                    className="w-full min-w-[200px] rounded-full bg-gradient-to-b from-[#AC66DA] to-[#904eb8] px-8 py-4 text-lg font-semibold text-[#E7E4E4] shadow-[0_8px_16px_-4px_rgba(172,102,218,0.3)] sm:w-auto border border-[#AC66DA]/50 cursor-pointer"
                  >
                    Get Started
                  </button>
                </ClerkLoading>
                <ClerkLoaded>
                  <SignedOut>
                    <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                      <button
                        type="button"
                        className="w-full min-w-[200px] rounded-full bg-gradient-to-b from-[#AC66DA] to-[#904eb8] px-8 py-4 text-lg font-semibold text-[#E7E4E4] shadow-[0_8px_16px_-4px_rgba(172,102,218,0.3)] transition-all hover:opacity-90 hover:scale-[1.02] hover:shadow-[0_10px_20px_-2px_rgba(172,102,218,0.4)] sm:w-auto border border-[#AC66DA]/50 cursor-pointer"
                      >
                        Get Started
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <Link
                      href="/dashboard"
                      className="inline-flex w-full min-w-[200px] items-center justify-center rounded-full bg-gradient-to-b from-[#AC66DA] to-[#904eb8] px-8 py-4 text-lg font-semibold text-[#E7E4E4] shadow-[0_8px_16px_-4px_rgba(172,102,218,0.3)] transition-all hover:opacity-90 hover:scale-[1.02] hover:shadow-[0_10px_20px_-2px_rgba(172,102,218,0.4)] sm:w-auto border border-[#AC66DA]/50 cursor-pointer"
                    >
                      Open dashboard
                    </Link>
                  </SignedIn>
                </ClerkLoaded>
              </div>
            </div>

            {/* Product screenshot */}
            <div className="relative mx-auto w-full max-w-[1280px] mt-2 mb-0 lg:mb-4 z-20 group">
              <div className="card-surface p-2 md:p-3 transition-transform duration-500 group-hover:-translate-y-2">
                <div className="mb-2 flex items-center justify-center border-b border-[#3a3a3a]/50 pb-2 md:mb-3 relative">
                  <div className="absolute left-2 md:left-4 flex gap-1.5 md:gap-2">
                    <span className="size-2.5 md:size-3 rounded-full bg-[#D93F3F]/80 shadow-inner" aria-hidden />
                    <span className="size-2.5 md:size-3 rounded-full bg-[#E7E4E4]/40 shadow-inner" aria-hidden />
                    <span className="size-2.5 md:size-3 rounded-full bg-[#74C648]/80 shadow-inner" aria-hidden />
                  </div>
                  <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">
                    moneta.app
                  </span>
                </div>
                <div className="relative overflow-hidden rounded-[20px] border border-[#1a1a1a] bg-[#1a1a1a] flex">
                  <div className="relative w-full h-auto">
                    <Image
                      src="/dashboard.png"
                      alt="Moneta dashboard showing balances, goals, and recent activity"
                      width={1904}
                      height={923}
                      className="w-full h-auto block"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="pt-16 pb-16 md:pt-24 md:pb-24 px-6 md:px-8 bg-gradient-to-b from-transparent to-[#1f1f1f]">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-16 space-y-6">
            <h2 className="text-[40px] md:text-[56px] lg:text-[64px] text-[#E7E4E4] font-bold leading-tight">
              Faster. Smarter.
              <br />
              Start in seconds
            </h2>
            <p className="text-body text-[#E7E4E4] opacity-70 max-w-2xl mx-auto text-lg">
              Get started in seconds with tools that handle the heavy lifting for you.
            </p>
          </div>

          {/* Bento Grid: 3 items first row, 2 items second row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Row 1 - Item 1 */}
            <div className="card-surface h-full flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <Spark width={24} height={24} strokeWidth={1.5} className="text-[#AC66DA]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">Smart Automation</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Your transactions categorized automatically so you don’t have to lift a finger.
              </p>
              {/* Screenshot visualization */}
              <div className="mt-auto pt-6 relative -mx-6 -mb-6">
                <div className="bg-[#1a1a1a] rounded-t-2xl border-t border-[#3a3a3a] overflow-hidden">
                  <Image
                    src="/expenses.png"
                    alt="Automation"
                    width={800}
                    height={450}
                    className="w-full h-auto block opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            </div>

            {/* Row 1 - Item 2 */}
            <div className="card-surface h-full flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <StatUp width={24} height={24} strokeWidth={1.5} className="text-[#74C648]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">Real-Time Insights</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Stop wondering where your money goes. See every trend as it happens.
              </p>
              {/* Screenshot visualization */}
              <div className="mt-auto pt-6 relative -mx-6 -mb-6">
                <div className="bg-[#1a1a1a] rounded-t-2xl border-t border-[#3a3a3a] overflow-hidden">
                  <Image
                    src="/statistics.png"
                    alt="Insights"
                    width={800}
                    height={450}
                    className="w-full h-auto block opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            </div>

            {/* Row 1 - Item 3 */}
            <div className="card-surface h-full flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <LotOfCash width={24} height={24} strokeWidth={1.5} className="text-[#AC66DA]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">All Your Transactions</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Instantly track every transaction across all your accounts. Find what you need, when you need it.
              </p>
              {/* Screenshot visualization */}
              <div className="mt-auto pt-6 relative -mx-6 -mb-6">
                <div className="bg-[#1a1a1a] rounded-t-2xl border-t border-[#3a3a3a] overflow-hidden">
                  <Image
                    src="/transactions.png"
                    alt="Transactions"
                    width={800}
                    height={450}
                    className="w-full h-auto block opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 - 2 items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-surface h-full flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <CalendarCheck width={24} height={24} strokeWidth={1.5} className="text-[#74C648]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">Goal Tracking</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Pick a goal, set a target, and watch your progress update in real-time.
              </p>
              {/* Screenshot visualization */}
              <div className="mt-auto pt-6 relative -mx-6 -mb-6">
                <div className="bg-[#1a1a1a] rounded-t-2xl border-t border-[#3a3a3a] overflow-hidden">
                  <Image
                    src="/goals.png"
                    alt="Goals"
                    width={800}
                    height={450}
                    className="w-full h-auto block opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            </div>

            <div className="card-surface h-full flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <BitcoinCircle width={24} height={24} strokeWidth={1.5} className="text-[#AC66DA]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">Investment Portfolio</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Keep an eye on everything from Bitcoin to stocks in one unified dashboard.
              </p>
              {/* Screenshot visualization */}
              <div className="mt-auto pt-6 relative -mx-6 -mb-6">
                <div className="bg-[#1a1a1a] rounded-t-2xl border-t border-[#3a3a3a] overflow-hidden">
                  <Image
                    src="/investments.png"
                    alt="Portfolio"
                    width={800}
                    height={450}
                    className="w-full h-auto block opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 md:py-24 px-6 md:px-8 bg-[#1f1f1f]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
            <div className="md:w-1/2 space-y-6 text-center md:text-left">
              <h2 className="text-[32px] md:text-[44px] lg:text-[48px] text-[#E7E4E4] font-bold leading-tight tracking-tight">
                A new standard for<br/>your financial life
              </h2>
              <p className="text-body text-[#E7E4E4] opacity-70 text-lg leading-relaxed max-w-md mx-auto md:mx-0">
                Moneta was engineered to solve a clear problem: financial apps are often cluttered and designed to sell user data. Managing your money shouldn't be a chore.
              </p>
            </div>
            
            <div className="md:w-1/2 w-full card-surface space-y-8">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#AC66DA]/10 border border-[#AC66DA]/20">
                    <CheckCircle width={18} height={18} className="text-[#AC66DA]" strokeWidth={2} />
                  </div>
                  <h3 className="text-card-header text-[#E7E4E4]">Radical Clarity</h3>
                </div>
                <p className="text-[#E7E4E4] opacity-70 text-body leading-relaxed pl-11">
                  The noise is stripped away so you can focus directly on your goals.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#74C648]/10 border border-[#74C648]/20">
                    <Spark width={18} height={18} className="text-[#74C648]" strokeWidth={2} />
                  </div>
                  <h3 className="text-card-header text-[#E7E4E4]">Privacy First</h3>
                </div>
                <p className="text-[#E7E4E4] opacity-70 text-body leading-relaxed pl-11">
                  No information is sold, and no credit cards are pushed. Secure by design.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#AC66DA]/10 border border-[#AC66DA]/20">
                    <StatUp width={18} height={18} className="text-[#AC66DA]" strokeWidth={2} />
                  </div>
                  <h3 className="text-card-header text-[#E7E4E4]">Built for Action</h3>
                </div>
                <p className="text-[#E7E4E4] opacity-70 text-body leading-relaxed pl-11">
                  Smart projections and real-time tracking for an active financial life.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="py-16 md:py-20 px-6 md:px-8 border-t border-[#2a2a2a] bg-gradient-to-b from-[#1f1f1f] to-background"
      >
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#AC66DA]/10 mb-1 border border-[#AC66DA]/20">
              <HeadsetHelp width={28} height={28} strokeWidth={1.5} className="text-[#AC66DA]" />
            </div>
            <h2 className="text-[32px] md:text-[40px] text-[#E7E4E4] font-bold tracking-tight leading-tight">
              Get in Touch
            </h2>
            <p className="text-base text-[#E7E4E4] opacity-70">
              Questions, feedback, or partnership ideas? Send a message below to get a response as soon as possible.
            </p>
          </div>
          
          <div className="w-full">
            <SendFeedbackCard />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-20 pb-12 px-6 md:px-8 bg-[#1f1f1f] border-t border-[#2a2a2a]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <Image src="/monetalogo.png" alt="Moneta" width={32} height={32} />
                <span className="text-sidebar-title text-[#E7E4E4] tracking-wider text-xl font-bold">MONETA</span>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-60 leading-relaxed max-w-sm pt-2">
                The financial dashboard built for modern life. Manage your money, track every expense, and reach your goals.
              </p>
            </div>

            {/* Navigation */}
            <div className="space-y-4">
              <h3 className="text-body font-semibold text-[#E7E4E4]">Navigation</h3>
              <nav className="flex flex-col gap-3">
                <a href="#features" onClick={(e) => handleNavClick(e, "features")} className="text-body text-[#E7E4E4] opacity-60 hover:opacity-100 transition-opacity">Features</a>
                <a href="#about" onClick={(e) => handleNavClick(e, "about")} className="text-body text-[#E7E4E4] opacity-60 hover:opacity-100 transition-opacity">About</a>
              </nav>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h3 className="text-body font-semibold text-[#E7E4E4]">Legal</h3>
              <nav className="flex flex-col gap-3">
                <Link href="/terms" className="text-body text-[#E7E4E4] opacity-60 hover:opacity-100 transition-opacity">Terms & Conditions</Link>
                <Link href="/privacy" className="text-body text-[#E7E4E4] opacity-60 hover:opacity-100 transition-opacity">Privacy Policy</Link>
              </nav>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-[#2a2a2a] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-helper text-[#E7E4E4] opacity-50">
              © {new Date().getFullYear()} Moneta. All rights reserved.
            </p>
            <p className="text-helper text-[#E7E4E4] opacity-50 flex items-center gap-1.5">
              Made with <span className="text-[#D93F3F]">❤️</span> by{' '}
              <a 
                href="https://egorkabantsov.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#AC66DA] font-semibold hover:opacity-80 transition-opacity"
              >
                Egor Kabantsov
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}