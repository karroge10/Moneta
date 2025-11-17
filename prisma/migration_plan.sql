-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Goal" DROP CONSTRAINT "Goal_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Investment" DROP CONSTRAINT "Investment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Bill" DROP CONSTRAINT "Bill_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Bill" DROP CONSTRAINT "Bill_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CategoriesCustom" DROP CONSTRAINT "CategoriesCustom_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CategoriesCustom" DROP CONSTRAINT "CategoriesCustom_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TripExpense" DROP CONSTRAINT "TripExpense_tripId_fkey";

-- DropIndex
DROP INDEX "public"."User_clerkUserId_key";

-- DropIndex
DROP INDEX "public"."CategoriesCustom_userId_idx";

-- DropIndex
DROP INDEX "public"."TripExpense_tripId_idx";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "clerkUserId",
DROP COLUMN "defaultPage",
DROP COLUMN "plan",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."CategoriesCustom" DROP COLUMN "categoryId",
DROP COLUMN "color",
DROP COLUMN "createdAt",
DROP COLUMN "icon",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "public"."Currency" ALTER COLUMN "alias" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."Language" ADD COLUMN     "alias" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Trip" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."TripExpense" DROP COLUMN "updatedAt",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "categoryId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."Transaction";

-- DropTable
DROP TABLE "public"."Goal";

-- DropTable
DROP TABLE "public"."Investment";

-- DropTable
DROP TABLE "public"."Bill";

-- DropTable
DROP TABLE "public"."Category";

-- DropTable
DROP TABLE "public"."Notification";

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Income" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_userName_key" ON "public"."User"("userName" ASC);

-- AddForeignKey
ALTER TABLE "public"."CategoriesCustom" ADD CONSTRAINT "CategoriesCustom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CategoriesCustom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "public"."Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Income" ADD CONSTRAINT "Income_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "public"."Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripExpense" ADD CONSTRAINT "TripExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CategoriesCustom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TripExpense" ADD CONSTRAINT "TripExpense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

