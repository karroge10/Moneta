import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher(["/", "/unauthorized", "/terms(.*)", "/privacy(.*)", "/api/feedback(.*)"]);

// Internal API routes that should be accessible via shared secret
// Cron routes bypass Clerk auth (they have their own security checks)
const isInternalRoute = createRouteMatcher([
  "/api/internal(.*)",
  "/api/cron(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  console.log(`[middleware] Request: ${pathname}`);
  
  // Handle cron routes - they have their own security (User-Agent or CRON_SECRET)
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next(); // Let the cron endpoint handle its own security
  }
  
  // Handle internal API routes with shared secret
  const internalSecretHeader = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (isInternalRoute(request)) {
    // When a secret is configured, enforce it strictly. Otherwise, allow the request
    // so environments without INTERNAL_API_SECRET (e.g., local dev) keep working.
    if (expectedSecret && internalSecretHeader !== expectedSecret) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return NextResponse.next();
  }
  
  // Protect all non-public routes
  if (!isPublicRoute(request)) {
    const { userId } = await auth();
    console.log(`[middleware] Path: ${pathname}, UserId: ${userId}`);
    
    // If not authenticated, redirect browsers to /unauthorized but return JSON for API
    // (otherwise fetch() follows the redirect, gets HTML 200, and response.json() throws)
    if (!userId) {
      if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.log(`[middleware] No userId, redirecting to /unauthorized from ${pathname}`);
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      // Path-only avoids localhost vs 127.0.0.1 redirect loops with Clerk return URLs
      const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      unauthorizedUrl.searchParams.set("redirect", returnPath);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // Set header to indicate pages that should render without sidebar
  const response = NextResponse.next();
  if (request.nextUrl.pathname === "/unauthorized") {
    response.headers.set("x-is-unauthorized", "true");
  }
  if (request.nextUrl.pathname === "/") {
    response.headers.set("x-is-landing-page", "true");
  }
  
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

