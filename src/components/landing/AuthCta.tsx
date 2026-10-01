"use client";

import Link from "next/link";
import { SignUpButton, SignedIn, SignedOut, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import { cx } from "@/components/ui/cx";

interface AuthCtaProps {
  /** Classes for the button or link, so the hero and the navbar can size it differently. */
  className: string;
  signedInLabel: React.ReactNode;
}

/**
 * "Get started" for visitors, a dashboard link for signed-in users. While Clerk loads, the sign-up
 * button is shown disabled so the layout does not jump.
 */
export default function AuthCta({ className, signedInLabel }: AuthCtaProps) {
  const classes = cx(
    "btn btn-primary inline-flex items-center justify-center font-semibold active:scale-[0.96]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    className,
  );

  return (
    <>
      <ClerkLoading>
        <button type="button" className={classes} disabled aria-disabled="true">
          Get started
        </button>
      </ClerkLoading>
      <ClerkLoaded>
        <SignedOut>
          <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
            <button type="button" className={classes}>
              Get started
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className={classes}>
            {signedInLabel}
          </Link>
        </SignedIn>
      </ClerkLoaded>
    </>
  );
}
