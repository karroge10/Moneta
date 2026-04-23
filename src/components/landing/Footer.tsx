"use client";

import Image from "next/image";
import Link from "next/link";

interface FooterProps {
  onNavClick: (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => void;
}

export default function Footer({ onNavClick }: FooterProps) {
  return (
    <footer className="pt-20 pb-12 px-6 md:px-8 bg-[#1f1f1f] border-t border-[#2a2a2a]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <Image src="/monetalogo.png" alt="Moneta" width={32} height={32} />
              <span className="text-sidebar-title text-[#E7E4E4] tracking-wider text-xl font-bold">MONETA</span>
            </div>
            <p className="text-body text-[#E7E4E4] opacity-60 leading-relaxed max-w-sm pt-2">
              The financial dashboard built for modern life. Manage your money, track every expense, and reach your goals.
            </p>
          </div>

          {}
          <div className="space-y-4">
            <h3 className="text-body font-semibold text-[#E7E4E4]">Navigation</h3>
            <nav className="flex flex-col gap-3">
              <a href="#features" onClick={(e) => onNavClick(e, "features")} className="text-body text-[#E7E4E4] opacity-60 hover:opacity-100 transition-opacity">Features</a>
              <a href="#about" onClick={(e) => onNavClick(e, "about")} className="text-body text-[#E7E4E4] opacity-60 hover:opacity-100 transition-opacity">About</a>
            </nav>
          </div>

          {}
          <div className="space-y-4">
            <h3 className="text-body font-semibold text-[#E7E4E4]">Legal</h3>
            <nav className="flex flex-col gap-3">
              <Link href="/terms" className="text-body text-[#E7E4E4] opacity-60 hover:opacity-100 transition-opacity">Terms & Conditions</Link>
              <Link href="/privacy" className="text-body text-[#E7E4E4] opacity-60 hover:opacity-100 transition-opacity">Privacy Policy</Link>
            </nav>
          </div>
        </div>

        {}
        <div className="pt-8 border-t border-[#2a2a2a] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-helper text-[#E7E4E4] opacity-50">
            © {new Date().getFullYear()} Moneta. All rights reserved.
          </p>
          <p className="text-helper text-[#E7E4E4] opacity-50 flex items-center gap-1.5">
            Made with <span className="text-[#D93F3F]">❤️</span> by{' '}
            <a 
              href="https://github.com/karroge10"
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#AC66DA] font-semibold hover:opacity-80 transition-opacity"
            >
              Egor Kabantsov
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
