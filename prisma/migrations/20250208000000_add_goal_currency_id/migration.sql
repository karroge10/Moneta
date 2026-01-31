-- AlterTable
ALTER TABLE "Goal" ADD COLUMN "currencyId" INTEGER;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
