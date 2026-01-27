-- Rename table and indexes from RecurringItem to RecurringTransaction
ALTER TABLE "RecurringItem" RENAME TO "RecurringTransaction";

-- Rename indexes if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'RecurringItem_pkey') THEN
    ALTER INDEX "RecurringItem_pkey" RENAME TO "RecurringTransaction_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'RecurringItem_userId_idx') THEN
    ALTER INDEX "RecurringItem_userId_idx" RENAME TO "RecurringTransaction_userId_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'RecurringItem_nextDueDate_idx') THEN
    ALTER INDEX "RecurringItem_nextDueDate_idx" RENAME TO "RecurringTransaction_nextDueDate_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'RecurringItem_type_idx') THEN
    ALTER INDEX "RecurringItem_type_idx" RENAME TO "RecurringTransaction_type_idx";
  END IF;
END $$;

