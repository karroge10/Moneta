import { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
}

export default function BentoGrid({ children }: BentoGridProps) {
  return (
    <div className="bento-grid px-6 pb-6">
      {children}
    </div>
  );
}

