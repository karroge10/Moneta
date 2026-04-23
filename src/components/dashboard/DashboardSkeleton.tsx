import CardSkeleton from './CardSkeleton';

export default function DashboardSkeleton() {
  return (
    <>
      {}
      <div className="flex flex-col gap-4 px-4 pb-4 md:hidden">
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton title="Income" variant="value" />
          <CardSkeleton title="Expenses" variant="value" />
        </div>
        <CardSkeleton title="Goals" variant="goal" />
        <CardSkeleton title="Financial Health" variant="health" />
        <CardSkeleton title="Upcoming Bills" variant="list" />
        <CardSkeleton title="Transactions" variant="list" />
        <CardSkeleton title="Update" variant="update" />
        <CardSkeleton title="Round-up" variant="value" />
        <CardSkeleton title="Investments" variant="list" />
        <CardSkeleton title="Top Expenses" variant="chart" />
      </div>

      {}
      <div className="hidden md:grid 2xl:hidden md:grid-cols-2 md:gap-4 md:px-6 md:pb-6">
        <CardSkeleton title="Income" variant="value" />
        <CardSkeleton title="Expenses" variant="value" />
        <CardSkeleton title="Round-up" variant="value" />
        <CardSkeleton title="Financial Health" variant="health" />
        <CardSkeleton title="Goals" variant="goal" />
        <CardSkeleton title="Upcoming Bills" variant="list" />
        <CardSkeleton title="Transactions" variant="list" />
        <CardSkeleton title="Top Expenses" variant="chart" />
        <div className="col-span-2">
          <CardSkeleton title="Investments" variant="list" />
        </div>
      </div>

      {}
      <div className="hidden 2xl:grid 2xl:grid-cols-4 2xl:gap-4 2xl:px-6 2xl:pb-6">
        <div className="col-span-3 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Update" variant="update" />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Income" variant="value" />
            </div>
            <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
              <CardSkeleton title="Expenses" variant="value" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4 flex-1">
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex-[7] min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Transactions" variant="list" />
              </div>
              <div className="min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Round-up" variant="value" />
              </div>
            </div>
            <div className="col-span-3 flex flex-col gap-4">
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <CardSkeleton title="Goals" variant="goal" />
                </div>
                <div className="col-span-2 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                  <CardSkeleton title="Financial Health" variant="health" />
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
                <CardSkeleton title="Investments" variant="list" />
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <CardSkeleton title="Upcoming Bills" variant="list" />
          </div>
          <div className="flex-1 min-h-0 flex flex-col [&>.card-surface]:h-full [&>.card-surface]:flex [&>.card-surface]:flex-col">
            <CardSkeleton title="Top Expenses" variant="chart" />
          </div>
        </div>
      </div>
    </>
  );
}
