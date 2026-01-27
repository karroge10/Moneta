-- Create enums if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecurringType') THEN
    CREATE TYPE "RecurringType" AS ENUM ('income', 'expense');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FrequencyUnit') THEN
    CREATE TYPE "FrequencyUnit" AS ENUM ('day', 'week', 'month', 'year');
  END IF;
END $$;

-- Ensure base tables exist (shadow db safety)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
    CREATE TABLE "User" (
      "id" SERIAL PRIMARY KEY,
      "clerkUserId" TEXT UNIQUE,
      "firstName" TEXT,
      "lastName" TEXT,
      "userName" TEXT UNIQUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "languageId" INT,
      "currencyId" INT,
      "defaultPage" TEXT,
      "plan" TEXT DEFAULT 'basic'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Currency') THEN
    CREATE TABLE "Currency" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "symbol" TEXT NOT NULL,
      "alias" TEXT NOT NULL
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Category') THEN
    CREATE TABLE "Category" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "icon" TEXT NOT NULL,
      "color" TEXT NOT NULL,
      "type" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Investment') THEN
    CREATE TABLE "Investment" (
      "id" SERIAL PRIMARY KEY,
      "userId" INT NOT NULL,
      "name" TEXT NOT NULL,
      "subtitle" TEXT,
      "ticker" TEXT,
      "assetType" TEXT,
      "sourceType" TEXT,
      "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
      "purchasePrice" DOUBLE PRECISION DEFAULT 0,
      "purchaseDate" TIMESTAMP(3),
      "purchaseCurrencyId" INT,
      "currentValue" DOUBLE PRECISION NOT NULL,
      "changePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "icon" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");
  END IF;
END $$;

-- AlterTable with IF NOT EXISTS guards
ALTER TABLE "Investment"
  ADD COLUMN IF NOT EXISTS "assetType" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseCurrencyId" INTEGER,
  ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "purchasePrice" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "sourceType" TEXT,
  ADD COLUMN IF NOT EXISTS "ticker" TEXT;

-- Create RecurringItem if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RecurringItem') THEN
    CREATE TABLE "RecurringItem" (
        "id" SERIAL NOT NULL,
        "userId" INTEGER NOT NULL,
        "type" "RecurringType" NOT NULL,
        "name" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "currencyId" INTEGER NOT NULL,
        "categoryId" INTEGER,
        "startDate" TIMESTAMP(3) NOT NULL,
        "nextDueDate" TIMESTAMP(3) NOT NULL,
        "frequencyUnit" "FrequencyUnit" NOT NULL,
        "frequencyInterval" INTEGER NOT NULL DEFAULT 1,
        "endDate" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastGeneratedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "RecurringItem_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "RecurringItem_userId_idx" ON "RecurringItem"("userId");
    CREATE INDEX "RecurringItem_nextDueDate_idx" ON "RecurringItem"("nextDueDate");
    CREATE INDEX "RecurringItem_type_idx" ON "RecurringItem"("type");
  END IF;
END $$;

-- AddForeignKeys with guards
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Investment_purchaseCurrencyId_fkey') THEN
    ALTER TABLE "Investment" ADD CONSTRAINT "Investment_purchaseCurrencyId_fkey" FOREIGN KEY ("purchaseCurrencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecurringItem_userId_fkey') THEN
    ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecurringItem_categoryId_fkey') THEN
    ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecurringItem_currencyId_fkey') THEN
    ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

