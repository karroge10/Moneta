"use client";

import Image from "next/image";
import Link from "next/link";
import { SignUpButton, SignedIn, SignedOut, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

export default function Hero() {
  return (
    <section
      id="home"
      className="relative pt-28 pb-16 md:pt-36 md:pb-24 px-6 md:px-8 overflow-x-clip"
    >
      {}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
      >
        <div className="absolute -top-32 left-1/2 h-[420px] w-[min(90vw,720px)] -translate-x-1/2 rounded-full bg-[#AC66DA]/25 blur-[100px]" />
        <div className="absolute top-1/3 right-0 h-[280px] w-[min(50vw,400px)] translate-x-1/4 rounded-full bg-[#74C648]/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-8 md:gap-10">
          {}
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

          {}
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
  );
}
