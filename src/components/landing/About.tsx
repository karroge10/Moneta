import { CheckCircle, Spark, StatUp } from "iconoir-react";
import { cx } from "@/components/ui/cx";

export default function About() {
  return (
    <section id="about" className="scroll-mt-24 bg-surface-inset px-6 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-12 md:flex-row lg:gap-20">
          <div className="space-y-6 text-center md:w-1/2 md:text-left">
            <h2 className="text-[32px] font-bold leading-tight tracking-tight text-fg text-balance md:text-[44px] lg:text-[48px]">
              A calmer way to run your finances
            </h2>
            <p className="mx-auto max-w-md text-lg leading-relaxed text-secondary text-pretty md:mx-0">
              Moneta exists because most finance apps are cluttered and built to sell you something. Managing your money
              should not be a chore.
            </p>
          </div>

          <div className="card-surface w-full space-y-8 md:w-1/2">
            <AboutItem
              icon={<CheckCircle width={18} height={18} strokeWidth={2} className="text-accent" />}
              title="Radical clarity"
              description="The noise is stripped away so you can focus on your goals."
              tone="accent"
            />
            <AboutItem
              icon={<Spark width={18} height={18} strokeWidth={2} className="text-positive" />}
              title="Privacy first"
              description="Your data is never sold and nobody pushes credit cards at you. Contributing to peer comparisons is optional and off with one switch."
              tone="positive"
            />
            <AboutItem
              icon={<StatUp width={18} height={18} strokeWidth={2} className="text-accent" />}
              title="Built for action"
              description="Goal projections and spending breakdowns update as soon as you add or import transactions."
              tone="accent"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutItem({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "accent" | "positive";
}) {
  const toneClass = tone === "accent" ? "border-accent/20 bg-accent/10" : "border-positive/20 bg-positive/10";
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className={cx("flex size-8 items-center justify-center rounded-full border", toneClass)} aria-hidden="true">
          {icon}
        </div>
        <h3 className="text-card-header text-fg">{title}</h3>
      </div>
      <p className="pl-11 text-copy text-secondary text-pretty">{description}</p>
    </div>
  );
}
