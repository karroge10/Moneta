import Image from "next/image";
import { Wallet } from "iconoir-react";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <main className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-10 flex items-center gap-4">
          <Image src="/monetalogo.png" alt="Moneta" width={48} height={48} priority />
          <h1 className="text-page-title">Moneta</h1>
        </header>

        <section className="card-surface mb-8">
          <div className="mb-2 text-card-header">Welcome</div>
          <p className="text-body" style={{ color: "var(--text-secondary)" }}>
            A calm, dark-themed finance experience. Built with Next.js 16 and React 19.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card-surface">
            <div className="flex items-center gap-2 text-card-header">
              <Wallet width={22} height={22} />
              Balance
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-card-currency">$</span>
              <span className="text-card-value">24,560</span>
            </div>
            <p className="mt-2 text-helper">Updated just now</p>
          </div>

          <div className="card-surface">
            <div className="text-card-header">Health</div>
            <div className="mt-2 text-fin-health-key" style={{ color: "var(--accent-green)" }}>82</div>
            <p className="mt-2 text-helper">On track this month</p>
          </div>

          <div className="card-surface">
            <div className="text-card-header">Insights</div>
            <div className="mt-3 badge-glow inline-block px-3 py-1" style={{ color: "var(--text-primary)" }}>
              New updates
            </div>
            <p className="mt-2 text-helper">Subtle purple glow badge</p>
          </div>
        </section>
      </main>
    </div>
  );
}
