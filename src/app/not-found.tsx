import Link from 'next/link';
import { NavArrowLeft } from 'iconoir-react';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 md:px-8 py-12 relative overflow-hidden">
      {/* Soft ambient background */}
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
        <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#AC66DA]/30 blur-[100px]" />
      </div>

      <div className="max-w-lg w-full mx-auto text-center space-y-8 rounded-[30px] p-8 md:p-12 surface-elevated bg-[#282828] border border-[#3a3a3a] shadow-xl relative z-10">
        {/* Logo in Circle */}
        <div className="flex justify-center -mt-16">
          <div className="p-2 rounded-full bg-[#202020] border border-[#3a3a3a] shadow-lg">
            <div className="p-3 bg-[#282828] rounded-full">
              <Image
                src="/monetalogo.png"
                alt="Moneta"
                width={48}
                height={48}
                priority
              />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-[64px] leading-none font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#AC66DA] to-[#E7E4E4] mb-2">
            404
          </h1>
          <h2 className="text-card-header text-[#E7E4E4] font-bold">
            Page not found
          </h2>
        </div>

        {/* Description */}
        <p className="text-body text-[#E7E4E4] opacity-80 leading-relaxed max-w-md mx-auto">
          The page you're looking for doesn't exist, has been moved, or is temporarily unavailable. Let's get you back.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center pt-2 w-full">
          <Link
            href="/dashboard"
            className="w-full sm:max-w-xs flex justify-center rounded-full bg-gradient-to-b from-[#AC66DA] to-[#904eb8] px-8 py-3.5 text-lg font-semibold text-[#E7E4E4] shadow-lg shadow-[#AC66DA]/30 transition-all hover:opacity-90 hover:scale-[1.02] border border-[#AC66DA]/50 mb-6"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Back to Home Link */}
        <div className="pt-6 border-t border-[#3a3a3a] w-full mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-body font-semibold text-[#E7E4E4] opacity-60 hover:opacity-100 hover:text-[#AC66DA] transition-colors bg-transparent border-0 m-auto"
          >
            <NavArrowLeft width={20} height={20} strokeWidth={1.5} />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
