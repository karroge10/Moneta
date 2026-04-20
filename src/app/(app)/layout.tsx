import Sidebar from "@/components/Sidebar";
import { SignedIn } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedIn>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex-1 min-w-0 transition-all duration-200 ease-in-out md:ml-[var(--sidebar-width)]">
          {children}
        </div>
      </div>
    </SignedIn>
  );
}
