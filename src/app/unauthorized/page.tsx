"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useClerk, SignedIn, SignedOut, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import { NavArrowLeft } from "iconoir-react";

export default function UnauthorizedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-copy text-secondary">Loading…</p>
        </div>
      }
    >
      <UnauthorizedContent />
    </Suspense>
  );
}

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { openSignIn, openSignUp, signOut } = useClerk();

  const handleSignOutAndHome = async () => {
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      router.push("/");
    }
  };

  const handleSignIn = () => {
    const redirectUrl = clerkReturnUrl(redirectParam);
    openSignIn({ redirectUrl });
  };

  const handleSignUp = () => {
    const redirectUrl = clerkReturnUrl(redirectParam);
    openSignUp({ redirectUrl });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-12 md:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-[100px]" />
      </div>

      <main className="surface-elevated relative z-10 mx-auto w-full max-w-lg space-y-8 rounded-card border border-line bg-surface-1 p-8 text-center shadow-xl md:p-12">
        <div className="-mt-16 flex justify-center">
          <div className="rounded-full border border-line bg-surface-inset p-2 shadow-lg">
            <div className="rounded-full bg-surface-1 p-3">
              <Image src="/monetalogo.png" alt="Moneta" width={48} height={48} priority />
            </div>
          </div>
        </div>

        <h1 className="text-page-title font-bold text-fg text-balance">Access restricted</h1>

        <ClerkLoading>
          <p className="mx-auto max-w-md text-copy text-secondary text-pretty">
            You need an account to view this page. Sign in to continue.
          </p>
          <div className="mt-4 flex w-full flex-col items-center justify-center pt-2">
            <button type="button" disabled className={`${PRIMARY_CLASS} mb-6`}>
              Get started
            </button>
          </div>
        </ClerkLoading>

        <ClerkLoaded>
          <SignedOut>
            <p className="mx-auto max-w-md text-copy text-secondary text-pretty">
              You need an account to view this page. Sign in to continue.
            </p>
            <div className="mt-4 flex w-full flex-col items-center justify-center pt-2">
              <button type="button" onClick={handleSignUp} className={PRIMARY_CLASS}>
                Get started
              </button>
              <button type="button" onClick={handleSignIn} className={`mt-6 ${TEXT_BUTTON_CLASS}`}>
                Already have an account? Sign in
              </button>
            </div>
          </SignedOut>
          <SignedIn>
            <p className="mx-auto max-w-md text-copy text-secondary text-pretty">
              You are signed in, but you do not have access to this page. Return to your dashboard.
            </p>
            <div className="mt-4 flex w-full flex-col items-center justify-center pt-2">
              <Link href="/dashboard" className={`${PRIMARY_CLASS} mb-6`}>
                Go to dashboard
              </Link>
              <button type="button" onClick={handleSignOutAndHome} className={TEXT_BUTTON_CLASS}>
                Sign out and return home
              </button>
            </div>
          </SignedIn>
        </ClerkLoaded>

        <div className="mt-8 w-full border-t border-line pt-6">
          <Link
            href="/"
            className="m-auto inline-flex items-center gap-2 text-copy font-semibold text-secondary transition-colors hover:text-accent-fg"
          >
            <NavArrowLeft width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
            <span>Return to home</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

/** Absolute same-origin URL for Clerk's redirect; anything off-site or malformed falls back to /dashboard. */
function clerkReturnUrl(redirectParam: string | null): string {
  const origin = window.location.origin;
  const path = safeReturnPath(redirectParam, origin);
  return `${origin}${path}`;
}

function safeReturnPath(redirectParam: string | null, origin: string): string {
  const fallback = "/dashboard";
  const raw = redirectParam?.trim() || fallback;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      return url.origin === origin ? `${url.pathname}${url.search}` : fallback;
    } catch {
      return fallback;
    }
  }
  // "//evil.com" is protocol-relative, so only a single leading slash counts as a local path.
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : fallback;
}

const PRIMARY_CLASS =
  "btn btn-primary flex w-full justify-center px-8 py-3.5 text-lg font-semibold active:scale-[0.96] disabled:opacity-60 sm:max-w-xs";
const TEXT_BUTTON_CLASS =
  "text-ui text-secondary underline-offset-4 transition-colors hover:text-fg hover:underline";
