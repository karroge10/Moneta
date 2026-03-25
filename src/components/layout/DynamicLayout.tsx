"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function DynamicLayout({ 
  children,
  initialIsUnauthorized,
  initialIsLanding
}: { 
  children: React.ReactNode,
  initialIsUnauthorized?: boolean,
  initialIsLanding?: boolean
}) {
  const pathname = usePathname();
  
  // Decide if we should show the sidebar
  // Use client-side pathname if available, otherwise fallback to server-provided initial state
  const isUnauthorized = pathname ? pathname === "/unauthorized" : initialIsUnauthorized;
  const isLanding = pathname ? pathname === "/" : initialIsLanding;
  
  if (isUnauthorized || isLanding) {
    return <>{children}</>;
  }
  
  return (
    <>
      <SignedIn>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <div className="flex-1 transition-all duration-200 ease-in-out md:ml-[var(--sidebar-width)]">
            {children}
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        {children}
      </SignedOut>
    </>
  );
}
