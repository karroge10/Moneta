import Image from "next/image";
import AuthCta from "./AuthCta";

/** Server rendered so the headline and the dashboard screenshot (the LCP element) ship in the HTML. */
export default function Hero() {
  return (
    <section id="home" className="relative scroll-mt-24 overflow-x-clip px-6 pb-16 pt-28 md:px-8 md:pb-24 md:pt-36">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[min(90vw,720px)] -translate-x-1/2 rounded-full bg-accent/25 blur-[100px]" />
        <div className="absolute right-0 top-1/3 h-[280px] w-[min(50vw,400px)] translate-x-1/4 rounded-full bg-positive/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-8 md:gap-10">
          <div className="z-10 mx-auto max-w-5xl space-y-8 pt-8 text-center md:pt-12">
            <h1 className="text-[54px] font-bold leading-[1.05] tracking-tight text-fg text-balance md:text-[78px] lg:text-[86px]">
              <span className="md:whitespace-nowrap">Smart financial dashboard</span>{" "}
              <span className="inline-block bg-gradient-to-r from-accent to-fg bg-clip-text pb-2 text-transparent">
                for modern life
              </span>
            </h1>
            <p className="mx-auto max-w-2xl pt-4 text-lg leading-relaxed text-fg/90 text-pretty md:text-xl">
              Track spending, income, goals and investments in one place, with clear charts and statement import that
              saves you the typing.
            </p>
            <div className="flex min-h-[60px] flex-col items-center justify-center gap-4 sm:flex-row">
              <AuthCta className="w-full min-w-[200px] px-8 py-4 text-lg sm:w-auto" signedInLabel="Open dashboard" />
            </div>
          </div>

          <div className="group relative z-20 mx-auto mb-0 mt-2 w-full max-w-[1280px] lg:mb-4">
            <div className="card-surface p-2 transition-transform duration-500 group-hover:-translate-y-2 md:p-3">
              <div className="relative mb-2 flex items-center justify-center border-b border-line/50 pb-2 md:mb-3">
                <div className="absolute left-2 flex gap-1.5 md:left-4 md:gap-2" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-negative/80 shadow-inner md:size-3" />
                  <span className="size-2.5 rounded-full bg-fg/40 shadow-inner md:size-3" />
                  <span className="size-2.5 rounded-full bg-positive/80 shadow-inner md:size-3" />
                </div>
                <span className="text-caption font-semibold uppercase tracking-widest text-muted">moneta.app</span>
              </div>
              <div className="relative flex overflow-hidden rounded-panel border border-surface-0 bg-surface-0">
                <Image
                  src="/dashboard.png"
                  alt="Moneta dashboard showing balances, goals, and recent activity"
                  width={1907}
                  height={1077}
                  sizes="(min-width: 1280px) 1256px, 100vw"
                  className="block h-auto w-full"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
