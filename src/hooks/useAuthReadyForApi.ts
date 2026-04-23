"use client";

import { useAuth } from "@clerk/nextjs";


export function useAuthReadyForApi(): boolean {
  const { isLoaded, isSignedIn } = useAuth();
  return isLoaded && isSignedIn;
}
