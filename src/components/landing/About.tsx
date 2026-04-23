"use client";

import { CheckCircle, Spark, StatUp } from "iconoir-react";

export default function About() {
  return (
    <section id="about" className="py-16 md:py-24 px-6 md:px-8 bg-[#1f1f1f]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          <div className="md:w-1/2 space-y-6 text-center md:text-left">
            <h2 className="text-[32px] md:text-[44px] lg:text-[48px] text-[#E7E4E4] font-bold leading-tight tracking-tight">
              A new standard for<br/>your financial life
            </h2>
            <p className="text-body text-[#E7E4E4] opacity-70 text-lg leading-relaxed max-w-md mx-auto md:mx-0">
              Moneta was engineered to solve a clear problem: financial apps are often cluttered and designed to sell user data. Managing your money shouldn't be a chore.
            </p>
          </div>
          
          <div className="md:w-1/2 w-full card-surface space-y-8">
            <AboutItem
              icon={<CheckCircle width={18} height={18} className="text-[#AC66DA]" strokeWidth={2} />}
              title="Radical Clarity"
              description="The noise is stripped away so you can focus directly on your goals."
              bgColor="purple"
            />
            <AboutItem
              icon={<Spark width={18} height={18} className="text-[#74C648]" strokeWidth={2} />}
              title="Privacy First"
              description="No information is sold, and no credit cards are pushed. Secure by design."
              bgColor="green"
            />
            <AboutItem
              icon={<StatUp width={18} height={18} className="text-[#AC66DA]" strokeWidth={2} />}
              title="Built for Action"
              description="Smart projections and real-time tracking for an active financial life."
              bgColor="purple"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AboutItem({ icon, title, description, bgColor }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  bgColor: 'purple' | 'green';
}) {
  const bgClass = bgColor === 'purple' ? 'bg-[#AC66DA]/10 border-[#AC66DA]/20' : 'bg-[#74C648]/10 border-[#74C648]/20';
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${bgClass}`}>
          {icon}
        </div>
        <h3 className="text-card-header text-[#E7E4E4]">{title}</h3>
      </div>
      <p className="text-[#E7E4E4] opacity-70 text-body leading-relaxed pl-11">
        {description}
      </p>
    </div>
  );
}
