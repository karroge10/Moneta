"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useClerk, SignedIn, SignedOut, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import { NavArrowLeft } from "iconoir-react";

function clerkReturnUrl(redirectParam: string | null): string {
  if (typeof window === "undefined") {
    return "/dashboard";
  }
  let path = redirectParam?.trim() || "/dashboard";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      if (u.origin === window.location.origin) {
        path = `${u.pathname}${u.search}`;
      } else {
        path = "/dashboard";
      }
    } catch {
      path = "/dashboard";
    }
  }
  if (!path.startsWith("/")) {
    path = "/dashboard";
  }
  return `${window.location.origin}${path}`;
}

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectUrl = clerkReturnUrl(redirectParam);
  const { openSignIn, openSignUp, signOut } = useClerk();

  const goHomeHard = () => {
    window.location.assign("/");
  };

  const handleSignOutAndHome = async () => {
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      goHomeHard();
    }
  };
  
  const handleSignIn = () => {
    openSignIn({
      redirectUrl: redirectUrl,
    });
  };
  
  const handleSignUp = () => {
    openSignUp({
      redirectUrl: redirectUrl,
    });
  };
  
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 md:px-8 py-12 relative overflow-hidden">
      {}
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#AC66DA]/30 blur-[100px]" />
      </div>

      <div className="max-w-lg w-full mx-auto text-center space-y-8 rounded-[30px] p-8 md:p-12 surface-elevated bg-[#282828] border border-[#3a3a3a] shadow-xl relative z-10">
        {}
        <div className="flex justify-center -mt-16">
          <div className="p-2 rounded-full bg-[#202020] border border-[#3a3a3a] shadow-lg">
            <div className="p-3 bg-[#282828] rounded-full">
              <Image
                src="/monetalogo.png"
                alt="Moneta"
                width={48}
                height={48}
                priority
              />
            </div>
          </div>
        </div>

        {}
        <h1 className="text-page-title text-[#E7E4E4] font-bold">
          Access Restricted
        </h1>

        {}
        <ClerkLoading>
          <div className="space-y-4">
            <p className="text-body text-[#E7E4E4] opacity-80 leading-relaxed max-w-md mx-auto">
              You need an account to view this dashboard. Please authenticate to continue securely.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center pt-2 w-full mt-4">
            <button
              type="button"
              className="w-full sm:max-w-xs rounded-full bg-gradient-to-b from-[#AC66DA] to-[#904eb8] px-8 py-3.5 text-lg font-semibold text-[#E7E4E4] shadow-lg shadow-[#AC66DA]/30 border border-[#AC66DA]/50 mb-6"
            >
              Get Started
            </button>
            <div className="h-5"></div>
          </div>
        </ClerkLoading>

        <ClerkLoaded>
          <div className="space-y-4">
            <SignedOut>
              <p className="text-body text-[#E7E4E4] opacity-80 leading-relaxed max-w-md mx-auto">
                You need an account to view this dashboard. Please authenticate to continue securely.
              </p>
            </SignedOut>
            <SignedIn>
              <p className="text-body text-[#E7E4E4] opacity-80 leading-relaxed max-w-md mx-auto">
                You're already signed in, but you don't have access to this feature. Return to your dashboard.
              </p>
            </SignedIn>
          </div>

          {}
          <div className="flex flex-col items-center justify-center pt-2 w-full mt-4">
            <SignedOut>
              <button 
                type="button" 
                onClick={handleSignUp}
                className="w-full sm:max-w-xs rounded-full bg-gradient-to-b from-[#AC66DA] to-[#904eb8] px-8 py-3.5 text-lg font-semibold text-[#E7E4E4] shadow-lg shadow-[#AC66DA]/30 transition-all hover:opacity-90 hover:scale-[1.02] border border-[#AC66DA]/50"
              >
                Get Started
              </button>
              <button 
                type="button" 
                onClick={handleSignIn}
                className="mt-6 text-sm text-[#E7E4E4] opacity-70 hover:opacity-100 transition-opacity bg-transparent border-0 cursor-pointer hover:underline"
              >
                Already have an account? Sign in
              </button>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="w-full sm:max-w-xs flex justify-center rounded-full bg-gradient-to-b from-[#AC66DA] to-[#904eb8] px-8 py-3.5 text-lg font-semibold text-[#E7E4E4] shadow-lg shadow-[#AC66DA]/30 transition-all hover:opacity-90 hover:scale-[1.02] border border-[#AC66DA]/50 mb-6"
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOutAndHome}
                className="text-sm text-[#E7E4E4] opacity-70 hover:opacity-100 transition-opacity bg-transparent border-0 cursor-pointer hover:underline"
              >
                Sign out and return Home
              </button>
            </SignedIn>
          </div>
        </ClerkLoaded>

        {}
        <div className="pt-6 border-t border-[#3a3a3a] w-full mt-8">
          <button
            type="button"
            onClick={goHomeHard}
            className="inline-flex items-center gap-2 text-body font-semibold text-[#E7E4E4] opacity-60 hover:opacity-100 hover:text-[#AC66DA] transition-colors bg-transparent border-0 cursor-pointer m-auto"
          >
            <NavArrowLeft width={20} height={20} strokeWidth={1.5} />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-body text-[#E7E4E4] opacity-70">Loading...</div>
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}

