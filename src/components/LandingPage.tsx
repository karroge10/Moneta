"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import {
  Wallet,
  ShoppingBag,
  Reports,
  Spark,
  HomeSimpleDoor,
  LotOfCash,
  BitcoinCircle,
  CalendarCheck,
  StatUp,
  Check,
  CheckCircle,
} from "iconoir-react";
import { pricingTiers } from "@/lib/pricingData";

export default function LandingPage({ initialUserPlan }: { initialUserPlan?: string | null }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [userPlan, setUserPlan] = useState<string | null>(initialUserPlan || null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Update active section based on scroll position
      const sections = ["home", "about", "features", "pricing", "contact"];
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
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Only fetch user plan client-side if it wasn't provided server-side
  // This handles cases where user signs in/out after initial page load
  useEffect(() => {
    if (initialUserPlan === undefined) {
      const fetchUserPlan = async () => {
        try {
          const response = await fetch('/api/user/settings');
          if (response.ok) {
            const data = await response.json();
            setUserPlan(data.plan || 'basic');
          }
        } catch (error) {
          // User might not be signed in or API might fail
          console.error('Failed to fetch user plan:', error);
        }
      };

      fetchUserPlan();
    }
  }, [initialUserPlan]);

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
    <div className="min-h-screen bg-[#202020]">
      {/* Navbar - Fixed on Scroll */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-[#3a3a3a] ${
          isScrolled ? "bg-[#202020]/95 backdrop-blur-sm" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-6 flex justify-between items-center">
          {/* Logo */}
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
              href="#about"
              onClick={(e) => handleNavClick(e, "about")}
              className="text-body font-semibold text-[#E7E4E4] hover:text-[#AC66DA] transition-colors"
            >
              About
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
              href="#pricing"
              onClick={(e) => handleNavClick(e, "pricing")}
              className={`text-body font-semibold transition-colors ${
                activeSection === "pricing" ? "text-[#AC66DA]" : "text-[#E7E4E4] hover:text-[#AC66DA]"
              }`}
            >
              Pricing
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

          {/* Right CTA */}
          <div className="flex items-center gap-4">
            <SignedIn>
              <Link
                href="/dashboard"
                className="flex items-center justify-center h-8 px-4 rounded-full bg-[#AC66DA] text-[#E7E4E4] font-semibold text-body hover:opacity-90 transition-opacity"
              >
                <span className="hidden sm:inline">Open Dashboard</span>
                <span className="sm:hidden">Open</span>
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "bg-[#282828] border border-[#3a3a3a]",
                    userButtonPopoverActionButton: "text-[#E7E4E4] hover:bg-[#3a3a3a]",
                    userButtonPopoverActionButtonText: "text-[#E7E4E4]",
                  },
                }}
              />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button
                  type="button"
                  className="hidden sm:block px-6 py-2.5 rounded-full text-body font-semibold text-[#E7E4E4] hover:opacity-80 transition-opacity"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-full bg-[#AC66DA] text-[#E7E4E4] font-semibold hover:opacity-90 transition-opacity"
                >
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-0 md:pt-40 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-8 mb-12">
            {/* Main Heading - 2 lines - Bigger */}
            <h1 className="text-[48px] md:text-[64px] lg:text-[72px] text-[#E7E4E4] font-bold leading-tight">
              Smart Financial Dashboard
              <br />
              for Modern Life
            </h1>

            {/* Subtitle */}
            <p className="text-body text-[#E7E4E4] opacity-90 max-w-2xl mx-auto leading-relaxed text-lg">
              Take control of your finances with intelligent insights, automated tracking, and
              personalized recommendations. All in one beautiful, secure dashboard.
            </p>

            {/* CTA Button */}
            <div className="pt-4">
              <SignedOut>
                <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <button
                    type="button"
                    className="px-8 py-3.5 rounded-full bg-[#AC66DA] text-[#E7E4E4] font-semibold text-body hover:opacity-90 transition-opacity"
                  >
                    Start Free Trial
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="inline-block px-8 py-3.5 rounded-full bg-[#AC66DA] text-[#E7E4E4] font-semibold text-body hover:opacity-90 transition-opacity"
                >
                  Open Dashboard
                </Link>
              </SignedIn>
            </div>
          </div>

          {/* Dashboard Screenshot - Transitions into next section with fade */}
          <div className="relative -mb-24 md:-mb-32">
            <div className="card-surface p-4 md:p-6 rounded-t-[30px] border-b-0 relative overflow-hidden">
              <div className="aspect-video bg-[#202020] rounded-[20px] border border-[#3a3a3a] flex items-center justify-center relative">
                <div className="text-center space-y-4">
                  <div className="text-body text-[#E7E4E4] opacity-50">Dashboard Preview</div>
                  <div className="text-helper text-[#E7E4E4] opacity-30">
                    Screenshot placeholder - Replace with actual dashboard image
                  </div>
                </div>
                {/* Fade gradient at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#202020] to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section - Bento Grid */}
      <section id="about" className="pt-48 md:pt-56 pb-16 md:pb-24 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-16 space-y-6">
            <h2 className="text-[40px] md:text-[56px] lg:text-[64px] text-[#E7E4E4] font-bold leading-tight">
              Faster. Smarter.
              <br />
              Start in seconds
            </h2>
            <p className="text-body text-[#E7E4E4] opacity-70 max-w-2xl mx-auto text-lg">
              Experience lightning-fast setup with intelligent features designed to optimize your workflow instantly.
            </p>
          </div>

          {/* Bento Grid: 3 items first row, 2 items second row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Row 1 - Item 1 */}
            <div className="card-surface flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Spark width={32} height={32} strokeWidth={1.5} className="text-[#AC66DA] opacity-30" />
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <Spark width={24} height={24} strokeWidth={1.5} className="text-[#AC66DA]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">Smart Automation</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Automatically categorize transactions and track your spending patterns without manual input.
              </p>
              {/* Mini graph visualization */}
              <div className="mt-4 h-16 flex items-end gap-1">
                {[40, 60, 45, 75, 55, 80].map((height, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-[#AC66DA] rounded-t"
                    style={{ height: `${height}%`, opacity: 0.6 }}
                  />
                ))}
              </div>
            </div>

            {/* Row 1 - Item 2 */}
            <div className="card-surface flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <StatUp width={32} height={32} strokeWidth={1.5} className="text-[#74C648] opacity-30" />
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <StatUp width={24} height={24} strokeWidth={1.5} className="text-[#74C648]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">Real-Time Insights</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Get instant visibility into your financial health with real-time analytics and trends.
              </p>
              {/* Mini chart visualization */}
              <div className="mt-4 h-16 flex items-end gap-1">
                {[30, 50, 65, 55, 70, 85].map((height, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-[#74C648] rounded-t"
                    style={{ height: `${height}%`, opacity: 0.6 }}
                  />
                ))}
              </div>
            </div>

            {/* Row 1 - Item 3 */}
            <div className="card-surface flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <CheckCircle width={32} height={32} strokeWidth={1.5} className="text-[#AC66DA] opacity-30" />
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <CheckCircle width={24} height={24} strokeWidth={1.5} className="text-[#AC66DA]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">Secure & Private</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Your financial data is encrypted and stored securely. We never share your information.
              </p>
              {/* Security indicator visualization */}
              <div className="mt-4 flex items-center gap-2">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-2 bg-[#AC66DA] rounded-full"
                    style={{ opacity: 0.3 + idx * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Row 2 - 2 items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-surface flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <CalendarCheck width={32} height={32} strokeWidth={1.5} className="text-[#74C648] opacity-30" />
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <CalendarCheck width={24} height={24} strokeWidth={1.5} className="text-[#74C648]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">Goal Tracking</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Set financial goals and track your progress with detailed milestones and personalized recommendations.
              </p>
              {/* Progress circle visualization */}
              <div className="mt-4 flex items-center justify-center">
                <div className="relative w-20 h-20">
                  <svg className="transform -rotate-90" width="80" height="80">
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="#3a3a3a"
                      strokeWidth="4"
                      fill="none"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      stroke="#74C648"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 30 * 0.75} ${2 * Math.PI * 30}`}
                      style={{ opacity: 0.6 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-body font-semibold text-[#74C648]">75%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-surface flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <BitcoinCircle width={32} height={32} strokeWidth={1.5} className="text-[#AC66DA] opacity-30" />
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
                  <BitcoinCircle width={24} height={24} strokeWidth={1.5} className="text-[#AC66DA]" />
                </div>
                <h3 className="text-card-header text-[#E7E4E4]">Investment Portfolio</h3>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                Monitor your investments across stocks, crypto, and other assets with comprehensive portfolio analytics.
              </p>
              {/* Portfolio distribution visualization */}
              <div className="mt-4 flex items-end gap-2 h-16">
                <div className="flex-1 bg-[#AC66DA] rounded-t" style={{ height: "100%", opacity: 0.6 }} />
                <div className="flex-1 bg-[#74C648] rounded-t" style={{ height: "75%", opacity: 0.6 }} />
                <div className="flex-1 bg-[#AC66DA] rounded-t" style={{ height: "60%", opacity: 0.6 }} />
                <div className="flex-1 bg-[#74C648] rounded-t" style={{ height: "45%", opacity: 0.6 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid (6 Cards) */}
      <section id="features" className="py-16 md:py-24 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-16 space-y-6">
            <h2 className="text-[40px] md:text-[56px] lg:text-[64px] text-[#E7E4E4] font-bold leading-tight">
              Key Features
            </h2>
            <p className="text-body text-[#E7E4E4] opacity-70 max-w-2xl mx-auto text-lg">
              Explore a range of cutting-edge tools designed to improve your financial health,
              simplify your processes, and deliver impactful results.
            </p>
          </div>

          {/* 3x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: LotOfCash,
                title: "Transaction Management",
                description: "Track every transaction with smart categorization and automatic tagging.",
                color: "#AC66DA",
              },
              {
                icon: StatUp,
                title: "Real-Time Analytics",
                description: "Get instant insights into your spending patterns and financial trends.",
                color: "#74C648",
              },
              {
                icon: Spark,
                title: "AI-Powered Insights",
                description: "Receive personalized recommendations to optimize your financial decisions.",
                color: "#AC66DA",
              },
              {
                icon: CalendarCheck,
                title: "Goal Setting",
                description: "Set financial goals and track your progress with detailed milestones.",
                color: "#74C648",
              },
              {
                icon: BitcoinCircle,
                title: "Investment Tracking",
                description: "Monitor your portfolio performance across multiple asset classes.",
                color: "#AC66DA",
              },
              {
                icon: Reports,
                title: "Detailed Reports",
                description: "Generate comprehensive reports to understand your financial health.",
                color: "#74C648",
              },
            ].map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div key={idx} className="card-surface text-center space-y-6 py-12 flex flex-col items-center justify-center min-h-[320px]">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-[#282828] border border-[#3a3a3a]">
                      <IconComponent width={48} height={48} strokeWidth={1.5} style={{ color: feature.color }} />
                    </div>
                  </div>
                  <h3 className="text-card-header text-[#E7E4E4]">{feature.title}</h3>
                  <p className="text-body text-[#E7E4E4] opacity-70">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection userPlan={userPlan} />

      {/* Footer */}
      <footer id="contact" className="py-12 md:py-16 px-6 md:px-8 border-t border-[#3a3a3a]">
        <div className="max-w-6xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-8">
            {/* Brand + Description */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Image src="/monetalogo.png" alt="Moneta" width={32} height={32} />
                <span className="text-sidebar-title text-[#E7E4E4]">MONETA</span>
              </div>
              <p className="text-body text-[#E7E4E4] opacity-70">
                MONETA is an AI-powered financial dashboard that helps you track your income,
                expenses, investments, and achieve your financial goals.
              </p>
            </div>

            {/* Navigation Links */}
            <div className="space-y-4">
              <h3 className="text-card-header text-[#E7E4E4]">Navigation</h3>
              <nav className="flex flex-col gap-3">
                <a
                  href="#about"
                  onClick={(e) => handleNavClick(e, "about")}
                  className="text-body text-[#E7E4E4] opacity-70 hover:text-[#AC66DA] transition-colors"
                >
                  About
                </a>
                <a
                  href="#features"
                  onClick={(e) => handleNavClick(e, "features")}
                  className="text-body text-[#E7E4E4] opacity-70 hover:text-[#AC66DA] transition-colors"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  onClick={(e) => handleNavClick(e, "pricing")}
                  className="text-body text-[#E7E4E4] opacity-70 hover:text-[#AC66DA] transition-colors"
                >
                  Pricing
                </a>
                <a
                  href="#contact"
                  onClick={(e) => handleNavClick(e, "contact")}
                  className="text-body text-[#E7E4E4] opacity-70 hover:text-[#AC66DA] transition-colors"
                >
                  Contact
                </a>
              </nav>
            </div>

            {/* Social Icons */}
            <div className="space-y-4">
              <h3 className="text-card-header text-[#E7E4E4]">Connect</h3>
              <div className="flex items-center gap-4">
                {/* Placeholder social icons - using simple divs for now */}
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-[#282828] border border-[#3a3a3a] flex items-center justify-center text-[#E7E4E4] hover:text-[#AC66DA] transition-colors"
                  aria-label="Instagram"
                >
                  <span className="text-body">IG</span>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-[#282828] border border-[#3a3a3a] flex items-center justify-center text-[#E7E4E4] hover:text-[#AC66DA] transition-colors"
                  aria-label="LinkedIn"
                >
                  <span className="text-body">LI</span>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 rounded-full bg-[#282828] border border-[#3a3a3a] flex items-center justify-center text-[#E7E4E4] hover:text-[#AC66DA] transition-colors"
                  aria-label="Twitter"
                >
                  <span className="text-body">X</span>
                </a>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="pt-8 border-t border-[#3a3a3a] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-helper text-[#E7E4E4] opacity-70">
              © 2024 Moneta. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-helper text-[#E7E4E4] opacity-70 hover:text-[#AC66DA] transition-colors">
                Terms and Conditions
              </a>
              <a href="#" className="text-helper text-[#E7E4E4] opacity-70 hover:text-[#AC66DA] transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Pricing Section Component
function PricingSection({ userPlan }: { userPlan: string | null }) {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-16 md:py-24 px-6 md:px-8 bg-[#282828]">
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-page-title text-[#E7E4E4] font-bold">Pricing Plans</h2>
          <p className="text-body text-[#E7E4E4] opacity-70 max-w-2xl mx-auto">
            Choose from our range of plans designed to help you maximize your financial
            performance, from basic tracking to advanced analytics and customization.
          </p>
        </div>

        {/* Pricing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <span
            className={`text-body transition-colors ${!isYearly ? "font-semibold" : ""}`}
            style={{ color: !isYearly ? "var(--text-primary)" : "var(--text-secondary)" }}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="relative w-14 h-7 rounded-full transition-colors cursor-pointer"
            style={{ backgroundColor: isYearly ? "var(--accent-purple)" : "#393939" }}
            aria-label={isYearly ? "Switch to monthly billing" : "Switch to yearly billing"}
          >
            <span
              className="absolute top-1 left-1 w-5 h-5 rounded-full transition-transform bg-white"
              style={{ transform: isYearly ? "translateX(28px)" : "translateX(0)" }}
            />
          </button>
          <span
            className={`text-body transition-colors ${isYearly ? "font-semibold" : ""}`}
            style={{ color: isYearly ? "var(--text-primary)" : "var(--text-secondary)" }}
          >
            Yearly <span style={{ color: "var(--accent-green)" }}>(Save 20%)</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingTiers.map((tier, index) => {
            // Map plan names: Basic Plan -> Basic, Premium Plan -> Standard, Ultimate Plan -> Enterprise
            const displayName = tier.name === "Basic Plan" ? "Basic" 
              : tier.name === "Premium Plan" ? "Standard" 
              : tier.name === "Ultimate Plan" ? "Enterprise" 
              : tier.name;

            return (
              <PricingCard
                key={tier.id}
                name={displayName}
                planId={tier.id}
                tagline={tier.tagline}
                monthlyPrice={tier.monthlyPrice}
                yearlyPrice={tier.yearlyPrice}
                features={tier.features.map(f => f.text)}
                ctaText={tier.ctaText}
                isEmphasized={index === 1} // Middle card (Standard/Premium) is emphasized
                isYearly={isYearly}
                userPlan={userPlan}
                hasDiscount={tier.hasDiscount}
                discountPercent={tier.discountPercent}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Pricing Card Component
interface PricingCardProps {
  name: string;
  planId: "basic" | "premium" | "ultimate";
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  ctaText: string;
  isEmphasized: boolean;
  isYearly: boolean;
  userPlan: string | null;
  hasDiscount?: boolean;
  discountPercent?: number;
}

function PricingCard({
  name,
  planId,
  tagline,
  monthlyPrice,
  yearlyPrice,
  features,
  ctaText,
  isEmphasized,
  isYearly,
  userPlan,
  hasDiscount,
  discountPercent,
}: PricingCardProps) {
  const price = isYearly ? yearlyPrice : monthlyPrice;
  const period = isYearly ? "/ year" : "/ month";

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `$ ${price.toFixed(2)}`;
  };

  // Determine button text and behavior based on user's plan
  const getButtonConfig = () => {
    if (!userPlan) {
      // Not signed in - show original CTAs
      return { text: ctaText, isCurrentPlan: false, isDisabled: false };
    }

    const planHierarchy: Record<string, number> = {
      basic: 1,
      premium: 2,
      ultimate: 3,
    };

    const userPlanLevel = planHierarchy[userPlan] || 1;
    const cardPlanLevel = planHierarchy[planId] || 1;

    if (cardPlanLevel === userPlanLevel) {
      // User is on this plan
      return { text: "Current Plan", isCurrentPlan: true, isDisabled: true };
    } else if (cardPlanLevel > userPlanLevel) {
      // Higher plan - show upgrade
      return { text: "Upgrade", isCurrentPlan: false, isDisabled: false };
    } else {
      // Lower plan - user is already on higher plan
      return { text: "Current Plan", isCurrentPlan: true, isDisabled: true };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="relative">
      {/* Discount Badge */}
      {hasDiscount && discountPercent && (
        <div
          className="absolute -top-4 right-4 px-5 py-2 text-sm font-bold transform rotate-12 z-10"
          style={{
            backgroundColor: "var(--accent-purple)",
            color: "#fff",
            clipPath: "polygon(0 0, 100% 0, 100% 75%, 85% 100%, 0 100%)",
          }}
        >
          {discountPercent}% OFF
        </div>
      )}

      <div
        className={`card-surface flex flex-col gap-6 border ${
          isEmphasized ? "border-2 border-[#AC66DA]" : "border-[#3a3a3a]"
        }`}
      >
      <div>
        <h3 className="text-card-header text-[#E7E4E4] mb-2">{name}</h3>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-card-value text-[#E7E4E4]">{formatPrice(price)}</span>
          {price > 0 && (
            <span className="text-body text-[#E7E4E4] opacity-70">{period}</span>
          )}
        </div>
        <p className="text-body text-[#E7E4E4] opacity-70">{tagline}</p>
      </div>

      <ul className="flex flex-col gap-3 flex-1">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <Check width={20} height={20} strokeWidth={2} style={{ color: "var(--accent-purple)" }} />
            </div>
            <span className="text-body text-[#E7E4E4]">{feature}</span>
          </li>
        ))}
      </ul>

      <SignedOut>
        <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
          <button
            className={`mt-4 py-3 px-6 rounded-full text-body font-semibold transition-colors cursor-pointer ${
              name === "Basic"
                ? "bg-[#282828] hover:bg-[#393939] text-[#E7E4E4]"
                : "bg-[#AC66DA] hover:opacity-90 text-[#E7E4E4]"
            }`}
          >
            {ctaText}
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        {buttonConfig.isDisabled ? (
          <button
            disabled
            className={`mt-4 py-3 px-6 rounded-full text-body font-semibold transition-colors cursor-not-allowed opacity-60 ${
              name === "Basic"
                ? "bg-[#282828] text-[#E7E4E4]"
                : "bg-[#AC66DA] text-[#E7E4E4]"
            }`}
          >
            {buttonConfig.text}
          </button>
        ) : buttonConfig.text === "Upgrade" ? (
          <Link
            href="/pricing"
            className={`mt-4 py-3 px-6 rounded-full text-body font-semibold transition-colors cursor-pointer inline-block text-center ${
              name === "Basic"
                ? "bg-[#282828] hover:bg-[#393939] text-[#E7E4E4]"
                : "bg-[#AC66DA] hover:opacity-90 text-[#E7E4E4]"
            }`}
          >
            {buttonConfig.text}
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className={`mt-4 py-3 px-6 rounded-full text-body font-semibold transition-colors cursor-pointer inline-block text-center ${
              name === "Basic"
                ? "bg-[#282828] hover:bg-[#393939] text-[#E7E4E4]"
                : "bg-[#AC66DA] hover:opacity-90 text-[#E7E4E4]"
            }`}
          >
            Open Dashboard
          </Link>
        )}
      </SignedIn>
      </div>
    </div>
  );
}