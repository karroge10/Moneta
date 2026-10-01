import Sidebar from "@/components/Sidebar";
import { SignedIn } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedIn>
      <div className="flex min-h-screen">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="min-w-0 flex-1 transition-[margin] duration-200 ease-in-out md:ml-[var(--sidebar-width)]">
          {children}
        </div>
      </div>
    </SignedIn>
  );
}
