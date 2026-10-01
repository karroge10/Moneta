import CardSkeleton from '@/components/dashboard/CardSkeleton';
import DashboardLayout, { type DashboardSlots } from '@/components/dashboard/DashboardLayout';

/** Dashboard placeholder in the same layout as the loaded page. */
export default function DashboardSkeleton() {
  return <DashboardLayout slots={skeletonSlots} />;
}

function skeletonSlots(): DashboardSlots {
  return {
    update: <CardSkeleton title="Update" variant="update" />,
    income: <CardSkeleton title="Income" variant="value" />,
    expenses: <CardSkeleton title="Expenses" variant="value" />,
    goals: <CardSkeleton title="Goals" variant="goal" />,
    health: <CardSkeleton title="Financial Health" variant="health" />,
    upcoming: <CardSkeleton title="Upcoming Bills" variant="list" />,
    transactions: <CardSkeleton title="Transactions" variant="list" />,
    insight: <CardSkeleton title="Round-up" variant="value" />,
    investments: <CardSkeleton title="Investments" variant="list" />,
    topExpenses: <CardSkeleton title="Top Expenses" variant="chart" />,
  };
}
