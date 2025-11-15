"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { NavArrowLeft } from "iconoir-react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const { openSignIn, openSignUp } = useClerk();
  
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
    <div className="min-h-screen bg-[#202020] flex flex-col items-center justify-center px-6 md:px-8 py-12">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Logo in Circle */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-[#282828] border border-[#3a3a3a]">
            <Image
              src="/monetalogo.png"
              alt="Moneta"
              width={64}
              height={64}
              priority
              className="rounded-full"
            />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-page-title text-[#E7E4E4] font-bold">
          Access Restricted
        </h1>

        {/* Description */}
        <div className="space-y-4">
          <p className="text-body text-[#E7E4E4] opacity-90 leading-relaxed">
            You need to be signed in to access this page. Please authenticate
            to continue.
          </p>
          <p className="text-helper text-[#E7E4E4]">
            If you already have an account, sign in below. Otherwise, create a
            new account to get started.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button 
            type="button" 
            onClick={handleSignIn}
            className="px-8 py-3.5 rounded-full bg-[#AC66DA] text-[#E7E4E4] font-semibold text-body hover:opacity-90 transition-opacity w-full sm:w-auto flex items-center justify-center gap-2"
          >
            Sign In
          </button>
          <button 
            type="button" 
            onClick={handleSignUp}
            className="px-8 py-3.5 rounded-full border border-[#3a3a3a] text-[#E7E4E4] font-semibold text-body hover:bg-[#282828] transition-colors w-full sm:w-auto"
          >
            Create Account
          </button>
        </div>

        {/* Back to Home Link */}
        <div className="pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-body text-[#E7E4E4] opacity-70 hover:opacity-100 transition-opacity"
          >
            <NavArrowLeft width={20} height={20} strokeWidth={1.5} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#202020] flex items-center justify-center">
        <div className="text-body text-[#E7E4E4] opacity-70">Loading...</div>
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}

