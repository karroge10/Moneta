import type { ReactNode } from 'react';
import GridCell from '@/components/dashboard/GridCell';
import type { LayoutBreakpoint } from '@/components/dashboard/DashboardLayout';

export interface CashflowSlots {
  update: ReactNode;
  total: ReactNode;
  /** Average card on expenses, Estimated Tax on income. */
  side: ReactNode;
  upcoming: ReactNode;
  latest: ReactNode;
  performance: ReactNode;
  breakdown: ReactNode;
  demographic: ReactNode;
  /** Round-up on expenses, Average on income. */
  extra: ReactNode;
}

interface CashflowLayoutProps {
  slots: (breakpoint: LayoutBreakpoint) => CashflowSlots;
  /** Phones show Total and the side card next to each other (expenses) or stacked (income). */
  pairTotalOnMobile: boolean;
}

/** Card placement for the expenses and income pages, shared with their skeleton. */
export default function CashflowLayout({ slots, pairTotalOnMobile }: CashflowLayoutProps) {
  const mobile = slots('mobile');
  const md = slots('md');
  const xl = slots('xl');

  return (
    <>
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        {mobile.update}
        {pairTotalOnMobile ? (
          <div className="grid grid-cols-2 gap-4">
            {mobile.total}
            {mobile.side}
          </div>
        ) : (
          <>
            {mobile.total}
            {mobile.side}
          </>
        )}
        {mobile.upcoming}
        {mobile.latest}
        {mobile.performance}
        {mobile.breakdown}
        {mobile.demographic}
        {mobile.extra}
      </div>

      <div className="hidden md:grid md:grid-cols-2 md:gap-4 md:px-6 md:pb-6 2xl:hidden">
        {md.update}
        {md.total}
        {md.side}
        {md.upcoming}
        {md.latest}
        {md.performance}
        {md.breakdown}
        {md.demographic}
        {md.extra}
      </div>

      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        <div className="col-span-3 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <GridCell>{xl.update}</GridCell>
            <GridCell>{xl.total}</GridCell>
            <GridCell>{xl.side}</GridCell>
          </div>
          <div className="grid flex-1 grid-cols-5 gap-4">
            <div className="col-span-3 flex flex-col gap-4">
              <GridCell className="flex-[7]">{xl.latest}</GridCell>
              <GridCell>{xl.demographic}</GridCell>
            </div>
            <div className="col-span-2 flex flex-col gap-4">
              <GridCell className="flex-1">{xl.performance}</GridCell>
              <GridCell>{xl.extra}</GridCell>
            </div>
          </div>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <GridCell>{xl.upcoming}</GridCell>
          <GridCell className="flex-1">{xl.breakdown}</GridCell>
        </div>
      </div>
    </>
  );
}
