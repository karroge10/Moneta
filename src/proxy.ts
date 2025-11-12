import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher(["/", "/unauthorized"]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all non-public routes
  if (!isPublicRoute(request)) {
    const { userId } = await auth();
    
    // If not authenticated, redirect to unauthorized page
    if (!userId) {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      // Preserve the original URL they tried to access for redirect after sign-in
      unauthorizedUrl.searchParams.set("redirect", request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

