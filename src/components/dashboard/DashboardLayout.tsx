import type { ReactNode } from 'react';
import GridCell from '@/components/dashboard/GridCell';

export type LayoutBreakpoint = 'mobile' | 'md' | 'xl';

export interface DashboardSlots {
  update: ReactNode;
  income: ReactNode;
  expenses: ReactNode;
  goals: ReactNode;
  health: ReactNode;
  upcoming: ReactNode;
  transactions: ReactNode;
  insight: ReactNode;
  investments: ReactNode;
  topExpenses: ReactNode;
}

interface DashboardLayoutProps {
  /** Called once per breakpoint so a card can use a different variant on phones or tablets. */
  slots: (breakpoint: LayoutBreakpoint) => DashboardSlots;
}

/** Card placement for phone, tablet and wide screens. Shared by the dashboard and its skeleton. */
export default function DashboardLayout({ slots }: DashboardLayoutProps) {
  const mobile = slots('mobile');
  const md = slots('md');
  const xl = slots('xl');

  return (
    <>
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        <div className="grid grid-cols-2 gap-4">
          {mobile.income}
          {mobile.expenses}
        </div>
        {mobile.goals}
        {mobile.health}
        {mobile.upcoming}
        {mobile.transactions}
        {mobile.update}
        {mobile.insight}
        {mobile.investments}
        {mobile.topExpenses}
      </div>

      <div className="hidden md:grid md:grid-cols-2 md:gap-4 md:px-6 md:pb-6 2xl:hidden">
        {md.income}
        {md.expenses}
        {md.insight}
        {md.health}
        {md.goals}
        {md.upcoming}
        {md.transactions}
        {md.topExpenses}
        <div className="col-span-2">{md.investments}</div>
      </div>

      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        <div className="col-span-3 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <GridCell>{xl.update}</GridCell>
            <GridCell>{xl.income}</GridCell>
            <GridCell>{xl.expenses}</GridCell>
          </div>
          <div className="grid flex-1 grid-cols-5 gap-4">
            <div className="col-span-2 flex flex-col gap-4">
              <GridCell className="flex-[7]">{xl.transactions}</GridCell>
              <GridCell>{xl.insight}</GridCell>
            </div>
            <div className="col-span-3 flex flex-col gap-4">
              <div className="grid grid-cols-5 gap-4">
                <GridCell className="col-span-3">{xl.goals}</GridCell>
                <GridCell className="col-span-2">{xl.health}</GridCell>
              </div>
              <GridCell className="flex-1">{xl.investments}</GridCell>
            </div>
          </div>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <GridCell>{xl.upcoming}</GridCell>
          <GridCell className="flex-1">{xl.topExpenses}</GridCell>
        </div>
      </div>
    </>
  );
}
