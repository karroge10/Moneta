import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/api-errors";


const isPublicRoute = createRouteMatcher([
  "/",
  "/unauthorized",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/terms(.*)",
  "/privacy(.*)",
  "/api/feedback(.*)",
  // Stripe calls this without a user session; it is authenticated by its signature instead.
  "/api/webhooks/stripe"
]);

// Machine-to-machine routes skip Clerk. Each handler authenticates the caller itself
// (CRON_SECRET bearer token for cron, x-internal-secret for internal routes).
const isMachineRoute = createRouteMatcher([
  "/api/internal(.*)",
  "/api/cron(.*)",
]);

const isInternalRoute = createRouteMatcher(["/api/internal(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;

  if (isInternalRoute(request) && !verifyInternalSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isMachineRoute(request)) {
    return NextResponse.next();
  }

  if (!isPublicRoute(request)) {
    const { userId } = await auth();

    if (!userId) {
      if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const unauthorizedUrl = new URL("/unauthorized", request.url);

      const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
      unauthorizedUrl.searchParams.set("redirect", returnPath);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }


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

    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",

    "/(api|trpc)(.*)",
  ],
};
