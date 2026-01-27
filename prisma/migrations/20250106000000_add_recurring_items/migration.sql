DO $$
BEGIN
  -- Ensure User table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User'
  ) THEN
    CREATE TABLE "User" (
      "id" SERIAL PRIMARY KEY,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;

  -- Ensure Category table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Category'
  ) THEN
    CREATE TABLE "Category" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "icon" TEXT NOT NULL,
      "color" TEXT NOT NULL,
      "type" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;

  -- Ensure Currency table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Currency'
  ) THEN
    CREATE TABLE "Currency" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "symbol" TEXT NOT NULL,
      "alias" TEXT NOT NULL
    );
  END IF;

  -- Create enums if missing
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecurringType') THEN
    CREATE TYPE "RecurringType" AS ENUM ('income', 'expense');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FrequencyUnit') THEN
    CREATE TYPE "FrequencyUnit" AS ENUM ('day', 'week', 'month', 'year');
  END IF;

  -- Create table RecurringItem if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'RecurringItem'
  ) THEN
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
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "lastGeneratedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "RecurringItem_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "RecurringItem_userId_idx" ON "RecurringItem"("userId");
    CREATE INDEX "RecurringItem_nextDueDate_idx" ON "RecurringItem"("nextDueDate");
    CREATE INDEX "RecurringItem_type_idx" ON "RecurringItem"("type");
    ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

