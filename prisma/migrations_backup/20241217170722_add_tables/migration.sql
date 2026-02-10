-- Placeholder migration recreated to align with existing database history.
-- This migration is intentionally a no-op because the corresponding schema
-- changes already exist in the target database.
DO $$
BEGIN
  -- Create Category table if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Category') THEN
    CREATE TABLE "Category" (
        "id" SERIAL NOT NULL,
        "name" TEXT NOT NULL,
        "icon" TEXT NOT NULL,
        "color" TEXT NOT NULL,
        "type" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
  END IF;

  -- Create Goal table if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Goal') THEN
    CREATE TABLE "Goal" (
        "id" SERIAL NOT NULL,
        "userId" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "targetDate" TIMESTAMP(3) NOT NULL,
        "targetAmount" DOUBLE PRECISION NOT NULL,
        "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Goal_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  END IF;

  -- Create Transaction table if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Transaction') THEN
    CREATE TABLE "Transaction" (
        "id" SERIAL NOT NULL,
        "userId" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "description" TEXT NOT NULL,
        "source" TEXT,
        "date" TIMESTAMP(3) NOT NULL,
        "categoryId" INTEGER,
        "currencyId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
  END IF;
END $$;


