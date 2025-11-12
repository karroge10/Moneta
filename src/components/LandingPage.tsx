"use client";

import Image from "next/image";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Wallet, LotOfCash, Reports, Spark } from "iconoir-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#202020] flex flex-col">
      {/* Header */}
      <header className="w-full px-6 md:px-8 py-6 flex justify-between items-center">
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
        <div className="flex items-center gap-4">
          <SignInButton mode="modal" redirectUrl="/dashboard">
            <button type="button" className="px-6 py-2.5 rounded-full text-body font-semibold text-[#E7E4E4] hover:opacity-80 transition-opacity">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal" redirectUrl="/dashboard">
            <button type="button" className="px-6 py-2.5 rounded-full bg-[#AC66DA] text-[#E7E4E4] font-semibold hover:opacity-90 transition-opacity">
              Get Started
            </button>
          </SignUpButton>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 md:px-8 py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Main Heading */}
          <h1 className="text-page-title text-[#E7E4E4] font-bold">
            Smart Financial Dashboard
          </h1>

          {/* Subheading */}
          <p className="text-body text-[#E7E4E4] opacity-90 max-w-2xl mx-auto leading-relaxed">
            Take control of your finances with intelligent insights, automated
            tracking, and personalized recommendations. All in one beautiful,
            secure dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <SignUpButton mode="modal" redirectUrl="/dashboard">
              <button type="button" className="px-8 py-3.5 rounded-full bg-[#AC66DA] text-[#E7E4E4] font-semibold text-body hover:opacity-90 transition-opacity w-full sm:w-auto">
                Start Free Trial
              </button>
            </SignUpButton>
            <SignInButton mode="modal" redirectUrl="/dashboard">
              <button type="button" className="px-8 py-3.5 rounded-full border border-[#3a3a3a] text-[#E7E4E4] font-semibold text-body hover:bg-[#282828] transition-colors w-full sm:w-auto">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-5xl mx-auto mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 px-6 md:px-8">
          <div className="card-surface text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-[#282828] border border-[#3a3a3a]">
                <Wallet width={32} height={32} strokeWidth={1.5} className="text-[#AC66DA]" />
              </div>
            </div>
            <h3 className="text-card-header text-[#E7E4E4]">Track Income</h3>
            <p className="text-helper text-[#E7E4E4]">
              Monitor all your income sources in one place with automated
              categorization and insights.
            </p>
          </div>

          <div className="card-surface text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-[#282828] border border-[#3a3a3a]">
                <LotOfCash width={32} height={32} strokeWidth={1.5} className="text-[#74C648]" />
              </div>
            </div>
            <h3 className="text-card-header text-[#E7E4E4]">Manage Expenses</h3>
            <p className="text-helper text-[#E7E4E4]">
              Smart expense tracking with category insights and spending
              patterns to help you save more.
            </p>
          </div>

          <div className="card-surface text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-[#282828] border border-[#3a3a3a]">
                <Reports width={32} height={32} strokeWidth={1.5} className="text-[#AC66DA]" />
              </div>
            </div>
            <h3 className="text-card-header text-[#E7E4E4]">AI Insights</h3>
            <p className="text-helper text-[#E7E4E4]">
              Get personalized financial recommendations powered by AI to
              optimize your financial health.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 md:px-8 py-6 border-t border-[#3a3a3a]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-helper text-[#E7E4E4]">
            © 2024 Moneta. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-helper text-[#E7E4E4]">
            <Spark width={16} height={16} strokeWidth={1.5} />
            <span>Powered by intelligent financial technology</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

