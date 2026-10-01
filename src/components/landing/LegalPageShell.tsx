import Link from 'next/link';
import { NavArrowLeft } from 'iconoir-react';
import { formatDate } from '@/lib/format';

interface LegalPageShellProps {
  title: string;
  /** ISO date of the last content change; shown as "Last updated". */
  updatedAt: string;
  children: React.ReactNode;
}

/** Layout for Terms and Privacy: back link, card, title, updated date and the numbered sections. */
export default function LegalPageShell({ title, updatedAt, children }: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-24">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-copy font-semibold text-secondary transition-colors hover:text-accent-fg"
        >
          <NavArrowLeft width={20} height={20} aria-hidden="true" />
          Back to home
        </Link>
        <article className="surface-elevated rounded-card border border-line bg-surface-1 p-8 shadow-lg md:p-12">
          <h1 className="mb-8 text-page-title font-bold tracking-tight text-fg text-balance">{title}</h1>
          <div className="space-y-6 text-copy text-secondary">
            <p>
              Last updated: <time dateTime={updatedAt}>{formatDate(updatedAt, 'medium')}</time>
            </p>
            {children}
          </div>
        </article>
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="mb-4 mt-8 text-heading font-bold text-fg text-balance">{title}</h2>
      {children}
    </section>
  );
}
