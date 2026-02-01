import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="card-surface flex flex-col gap-6 max-w-md w-full text-center">
        <p
          className="text-fin-health-key leading-none"
          style={{ color: 'var(--text-primary)' }}
        >
          404
        </p>
        <h1 className="text-card-header" style={{ color: 'var(--text-primary)' }}>
          Page not found
        </h1>
        <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-full text-body font-semibold transition-colors hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-purple)',
              color: 'var(--text-primary)',
            }}
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-full text-body font-semibold transition-colors hover:opacity-90 border border-[#3a3a3a]"
            style={{ color: 'var(--text-primary)' }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
