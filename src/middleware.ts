import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


const isPublicRoute = createRouteMatcher([
  "/", 
  "/unauthorized", 
  "/sign-in(.*)", 
  "/sign-up(.*)", 
  "/terms(.*)", 
  "/privacy(.*)", 
  "/api/feedback(.*)"
]);



const isInternalRoute = createRouteMatcher([
  "/api/internal(.*)",
  "/api/cron(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  console.log(`[middleware] Request: ${pathname}`);
  
  
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next(); 
  }
  
  
  const internalSecretHeader = request.headers.get("x-internal-secret");
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (isInternalRoute(request)) {
    
    
    if (expectedSecret && internalSecretHeader !== expectedSecret) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return NextResponse.next();
  }
  
  
  if (!isPublicRoute(request)) {
    const { userId } = await auth();
    console.log(`[middleware] Path: ${pathname}, UserId: ${userId}`);
    
    
    
    if (!userId) {
      if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.log(`[middleware] No userId, redirecting to /unauthorized from ${pathname}`);
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
    
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    
    "/(api|trpc)(.*)",
  ],
};

