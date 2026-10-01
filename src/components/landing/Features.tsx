import Image from "next/image";
import { Spark, StatUp, LotOfCash, CalendarCheck, BitcoinCircle } from "iconoir-react";

const SCREENSHOT_WIDTH = 1625;
const SCREENSHOT_HEIGHT = 1077;
const THREE_COLUMN_SIZES = "(min-width: 1152px) 368px, (min-width: 768px) 33vw, 100vw";
const TWO_COLUMN_SIZES = "(min-width: 1152px) 564px, (min-width: 768px) 50vw, 100vw";

export default function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-24 bg-gradient-to-b from-transparent to-surface-inset px-6 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 space-y-6 text-center">
          <h2 className="text-[40px] font-bold leading-tight text-fg text-balance md:text-[56px] lg:text-[64px]">
            Everything in one place
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-secondary text-pretty">
            Import a bank statement or add transactions by hand, and Moneta turns them into a clear picture of your money.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Spark width={24} height={24} strokeWidth={1.5} className="text-accent" />}
            title="Statement import"
            description="Upload a bank statement PDF. Merchants you have categorized before are recognized next time."
            imageSrc="/expenses.png"
            imageAlt="Expenses page with spending by category"
            sizes={THREE_COLUMN_SIZES}
          />
          <FeatureCard
            icon={<StatUp width={24} height={24} strokeWidth={1.5} className="text-positive" />}
            title="Clear insights"
            description="See where your money goes, how spending trends month to month, and how you compare with peers."
            imageSrc="/statistics.png"
            imageAlt="Statistics page with spending trends"
            sizes={THREE_COLUMN_SIZES}
          />
          <FeatureCard
            icon={<LotOfCash width={24} height={24} strokeWidth={1.5} className="text-accent" />}
            title="All your transactions"
            description="Search, filter and edit every transaction you have imported or added, in any currency."
            imageSrc="/transactions.png"
            imageAlt="Transactions list with filters"
            sizes={THREE_COLUMN_SIZES}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FeatureCard
            icon={<CalendarCheck width={24} height={24} strokeWidth={1.5} className="text-positive" />}
            title="Goal tracking"
            description="Pick a goal, set a target, and see your progress toward it."
            imageSrc="/goals.png"
            imageAlt="Goals page with progress bars"
            sizes={TWO_COLUMN_SIZES}
          />
          <FeatureCard
            icon={<BitcoinCircle width={24} height={24} strokeWidth={1.5} className="text-accent" />}
            title="Investment portfolio"
            description="Keep crypto, stocks and private assets together in one portfolio view."
            imageSrc="/investments.png"
            imageAlt="Investments page with portfolio allocation"
            sizes={TWO_COLUMN_SIZES}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  imageSrc,
  imageAlt,
  sizes,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  sizes: string;
}) {
  return (
    <div className="card-surface group flex h-full flex-col gap-4 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-line bg-surface-1 p-3" aria-hidden="true">
          {icon}
        </div>
        <h3 className="text-card-header text-fg">{title}</h3>
      </div>
      <p className="text-copy text-secondary text-pretty">{description}</p>
      <div className="relative -mx-6 -mb-6 mt-auto pt-6">
        <div className="overflow-hidden rounded-t-panel border-t border-line bg-surface-0">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={SCREENSHOT_WIDTH}
            height={SCREENSHOT_HEIGHT}
            sizes={sizes}
            className="block h-auto w-full opacity-80 transition-[opacity,scale] duration-700 group-hover:scale-[1.02] group-hover:opacity-100"
          />
        </div>
      </div>
    </div>
  );
}
