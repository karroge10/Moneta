import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher(["/", "/unauthorized"]);

// Internal API routes that use secret header instead of auth
const isInternalRoute = createRouteMatcher(["/api/internal(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  // Check for internal API secret header (for Python service callbacks)
  const internalSecret = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  
  if (isInternalRoute(request) && internalSecret === expectedSecret && expectedSecret) {
    // Allow internal routes with correct secret header
    return NextResponse.next();
  }
  
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

