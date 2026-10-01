import Image from "next/image";
import Link from "next/link";

const LINK_CLASS = "text-copy text-secondary transition-colors hover:text-fg";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line-subtle bg-surface-inset px-6 pb-12 pt-20 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <Image src="/monetalogo.png" alt="" width={32} height={32} />
              <span className="text-xl font-bold tracking-wider text-fg">MONETA</span>
            </div>
            <p className="max-w-sm pt-2 text-copy text-secondary text-pretty">
              The financial dashboard built for modern life. Manage your money, track every expense, and reach your goals.
            </p>
          </div>

          <nav aria-labelledby="footer-navigation" className="space-y-4">
            <h2 id="footer-navigation" className="text-copy font-semibold text-fg">
              Navigation
            </h2>
            <ul className="flex flex-col gap-3">
              <li>
                <a href="#features" className={LINK_CLASS}>
                  Features
                </a>
              </li>
              <li>
                <a href="#about" className={LINK_CLASS}>
                  About
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal" className="space-y-4">
            <h2 id="footer-legal" className="text-copy font-semibold text-fg">
              Legal
            </h2>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/terms" className={LINK_CLASS}>
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={LINK_CLASS}>
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-line-subtle pt-8 md:flex-row">
          <p className="text-caption text-muted">
            © {year} Moneta. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-caption text-muted">
            Made with <span aria-label="love">❤️</span> by{" "}
            <a
              href="https://github.com/karroge10"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent-fg transition-opacity hover:opacity-80"
            >
              Egor Kabantsov
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
