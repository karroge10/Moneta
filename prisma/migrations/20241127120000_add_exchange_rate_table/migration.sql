DO $$
BEGIN
  -- Create Currency table if it does not exist (shadow DB safety)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Currency'
  ) THEN
    CREATE TABLE "Currency" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "symbol" TEXT NOT NULL,
      "alias" TEXT NOT NULL
    );
  END IF;

  -- Create ExchangeRate table if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ExchangeRate'
  ) THEN
    CREATE TABLE "ExchangeRate" (
        "id" SERIAL NOT NULL,
        "baseCurrencyId" INTEGER NOT NULL,
        "quoteCurrencyId" INTEGER NOT NULL,
        "rate" DECIMAL(18,8) NOT NULL,
        "rateDate" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX "ExchangeRate_baseCurrencyId_quoteCurrencyId_rateDate_key" ON "ExchangeRate"("baseCurrencyId", "quoteCurrencyId", "rateDate");
    CREATE INDEX "ExchangeRate_baseCurrencyId_quoteCurrencyId_rateDate_idx" ON "ExchangeRate"("baseCurrencyId", "quoteCurrencyId", "rateDate");
    ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_baseCurrencyId_fkey" FOREIGN KEY ("baseCurrencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_quoteCurrencyId_fkey" FOREIGN KEY ("quoteCurrencyId") REFERENCES "Currency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;




