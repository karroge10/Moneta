"use client";

import Image from "next/image";
import { Spark, StatUp, LotOfCash, CalendarCheck, BitcoinCircle } from "iconoir-react";

export default function Features() {
  return (
    <section id="features" className="pt-16 pb-16 md:pt-24 md:pb-24 px-6 md:px-8 bg-gradient-to-b from-transparent to-[#1f1f1f]">
      <div className="max-w-6xl mx-auto">
        {}
        <div className="text-center mb-16 space-y-6">
          <h2 className="text-[40px] md:text-[56px] lg:text-[64px] text-[#E7E4E4] font-bold leading-tight">
            Faster. Smarter.
            <br />
            Start in seconds
          </h2>
          <p className="text-body text-[#E7E4E4] opacity-70 max-w-2xl mx-auto text-lg">
            Get started in seconds with tools that handle the heavy lifting for you.
          </p>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <FeatureCard
            icon={<Spark width={24} height={24} strokeWidth={1.5} className="text-[#AC66DA]" />}
            title="Smart Automation"
            description="Your transactions categorized automatically so you don’t have to lift a finger."
            imageSrc="/expenses.png"
            imageAlt="Automation"
            color="purple"
          />
          <FeatureCard
            icon={<StatUp width={24} height={24} strokeWidth={1.5} className="text-[#74C648]" />}
            title="Real-Time Insights"
            description="Stop wondering where your money goes. See every trend as it happens."
            imageSrc="/statistics.png"
            imageAlt="Insights"
            color="green"
          />
          <FeatureCard
            icon={<LotOfCash width={24} height={24} strokeWidth={1.5} className="text-[#AC66DA]" />}
            title="All Your Transactions"
            description="Instantly track every transaction across all your accounts. Find what you need."
            imageSrc="/transactions.png"
            imageAlt="Transactions"
            color="purple"
          />
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureCard
            icon={<CalendarCheck width={24} height={24} strokeWidth={1.5} className="text-[#74C648]" />}
            title="Goal Tracking"
            description="Pick a goal, set a target, and watch your progress update in real-time."
            imageSrc="/goals.png"
            imageAlt="Goals"
            color="green"
          />
          <FeatureCard
            icon={<BitcoinCircle width={24} height={24} strokeWidth={1.5} className="text-[#AC66DA]" />}
            title="Investment Portfolio"
            description="Keep an eye on everything from Bitcoin to stocks in one unified dashboard."
            imageSrc="/investments.png"
            imageAlt="Portfolio"
            color="purple"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, description, imageSrc, imageAlt, color }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  imageSrc: string; 
  imageAlt: string;
  color: 'purple' | 'green';
}) {
  return (
    <div className="card-surface h-full flex flex-col gap-4 group hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-[#282828] border border-[#3a3a3a]">
          {icon}
        </div>
        <h3 className="text-card-header text-[#E7E4E4]">{title}</h3>
      </div>
      <p className="text-body text-[#E7E4E4] opacity-70">
        {description}
      </p>
      <div className="mt-auto pt-6 relative -mx-6 -mb-6">
        <div className="bg-[#1a1a1a] rounded-t-2xl border-t border-[#3a3a3a] overflow-hidden">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={800}
            height={450}
            className="w-full h-auto block opacity-80 group-hover:opacity-100 transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </div>
      </div>
    </div>
  );
}
