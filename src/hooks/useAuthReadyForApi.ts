"use client";

import { useAuth } from "@clerk/nextjs";

/**
 * Clerk client has finished loading and the user is signed in — safe to call authenticated /api routes.
 * Avoids 401s on the first paint after OAuth when session cookies are not attached to fetch yet.
 */
export function useAuthReadyForApi(): boolean {
  const { isLoaded, isSignedIn } = useAuth();
  return isLoaded && isSignedIn;
}
