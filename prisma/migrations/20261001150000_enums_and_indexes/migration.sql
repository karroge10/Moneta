-- Typed enums for values that were free-form strings. Existing data only contains
-- the enum values (checked before writing this migration), so the casts are lossless.

-- RecurringType becomes the shared TransactionType for transactions, categories and recurring items
ALTER TYPE "RecurringType" RENAME TO "TransactionType";

ALTER TABLE "Transaction" ALTER COLUMN "type" TYPE "TransactionType" USING "type"::"TransactionType";
ALTER TABLE "Category" ALTER COLUMN "type" TYPE "TransactionType" USING "type"::"TransactionType";

CREATE TYPE "JobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');
ALTER TABLE "PdfProcessingJob" ALTER COLUMN "status" TYPE "JobStatus" USING "status"::"JobStatus";

-- Exchange rates are stored once per currency pair per UTC day. Older code saved
-- rates fetched on demand under the full transaction timestamp; collapse those onto
-- the day, keeping a row that was already at midnight, otherwise the latest one.
DELETE FROM "ExchangeRate"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "baseCurrencyId", "quoteCurrencyId", date_trunc('day', "rateDate")
        ORDER BY ("rateDate" = date_trunc('day', "rateDate")) DESC, "updatedAt" DESC, "id" DESC
      ) AS rn
    FROM "ExchangeRate"
  ) ranked
  WHERE ranked.rn > 1
);

UPDATE "ExchangeRate"
SET "rateDate" = date_trunc('day', "rateDate")
WHERE "rateDate" <> date_trunc('day', "rateDate");

-- Indexes that match the real query shapes; drop ones duplicated by unique constraints
DROP INDEX "Transaction_userId_idx";
DROP INDEX "Transaction_date_idx";
DROP INDEX "Transaction_type_idx";
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

DROP INDEX "Notification_userId_idx";
DROP INDEX "Notification_read_idx";
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

DROP INDEX "PdfProcessingJob_userId_idx";
DROP INDEX "PdfProcessingJob_status_idx";
DROP INDEX "PdfProcessingJob_createdAt_idx";
CREATE INDEX "PdfProcessingJob_userId_createdAt_idx" ON "PdfProcessingJob"("userId", "createdAt");
CREATE INDEX "PdfProcessingJob_status_createdAt_idx" ON "PdfProcessingJob"("status", "createdAt");

DROP INDEX "RecurringTransaction_nextDueDate_idx";
DROP INDEX "RecurringTransaction_type_idx";
CREATE INDEX "RecurringTransaction_isActive_nextDueDate_idx" ON "RecurringTransaction"("isActive", "nextDueDate");

DROP INDEX "PortfolioSnapshot_userId_idx";
DROP INDEX "PortfolioSnapshot_timestamp_idx";
CREATE INDEX "PortfolioSnapshot_userId_timestamp_idx" ON "PortfolioSnapshot"("userId", "timestamp");

DROP INDEX "ExchangeRate_baseCurrencyId_quoteCurrencyId_rateDate_idx";
DROP INDEX "LearningLessonProgress_userId_idx";
DROP INDEX "UserNotificationSettings_userId_idx";
DROP INDEX "Merchant_userId_idx";
DROP INDEX "MerchantGlobal_namePattern_idx";
