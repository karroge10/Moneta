import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { NavArrowLeft } from 'iconoir-react';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-12 md:px-8">
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-[100px]" />
      </div>

      <main className="surface-elevated relative z-10 mx-auto w-full max-w-lg space-y-8 rounded-card border border-line bg-surface-1 p-8 text-center shadow-xl md:p-12">
        <div className="-mt-16 flex justify-center">
          <div className="rounded-full border border-line bg-surface-inset p-2 shadow-lg">
            <div className="rounded-full bg-surface-1 p-3">
              <Image src="/monetalogo.png" alt="Moneta" width={48} height={48} priority />
            </div>
          </div>
        </div>

        <div>
          <p
            className="mb-2 bg-gradient-to-r from-accent to-fg bg-clip-text text-[64px] font-bold leading-none tabular-nums text-transparent"
            aria-hidden="true"
          >
            404
          </p>
          <h1 className="text-card-header font-bold text-fg">Page not found</h1>
        </div>

        <p className="mx-auto max-w-md text-copy text-secondary text-pretty">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="flex w-full flex-col items-center justify-center pt-2">
          <Link
            href="/dashboard"
            className="btn btn-primary mb-6 flex w-full justify-center px-8 py-3.5 text-lg font-semibold active:scale-[0.96] sm:max-w-xs"
          >
            Go to dashboard
          </Link>
        </div>

        <div className="mt-8 w-full border-t border-line pt-6">
          <Link
            href="/"
            className="m-auto inline-flex items-center gap-2 text-copy font-semibold text-secondary transition-colors hover:text-accent-fg"
          >
            <NavArrowLeft width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
            <span>Return to home</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
