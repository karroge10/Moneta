-- Move money columns from double precision (binary float) to exact NUMERIC(19,4).
--
-- Safe for existing data:
--   * ALTER COLUMN ... TYPE rewrites each row in place, keeping every value.
--   * ROUND(x::numeric, 4) turns float noise like 12.300000000000001 into 12.3000.
--     Amounts entered in the app have at most 2 decimals, so nothing visible changes.
--   * Postgres DDL is transactional: if any statement fails, the whole migration rolls
--     back and the old columns stay as they were.
--
-- Locking: each ALTER takes an ACCESS EXCLUSIVE lock and rewrites the table. Fine for
-- a few thousand rows (seconds). For a large production table use expand/contract
-- instead: add a new column, backfill in batches, switch reads, then drop the old one.

BEGIN;

ALTER TABLE "Transaction"
  ALTER COLUMN "amount" TYPE DECIMAL(19,4) USING ROUND("amount"::numeric, 4);

ALTER TABLE "Goal"
  ALTER COLUMN "targetAmount" TYPE DECIMAL(19,4) USING ROUND("targetAmount"::numeric, 4),
  ALTER COLUMN "currentAmount" TYPE DECIMAL(19,4) USING ROUND("currentAmount"::numeric, 4),
  ALTER COLUMN "currentAmount" SET DEFAULT 0;

ALTER TABLE "RecurringTransaction"
  ALTER COLUMN "amount" TYPE DECIMAL(19,4) USING ROUND("amount"::numeric, 4);

ALTER TABLE "PortfolioSnapshot"
  ALTER COLUMN "totalValue" TYPE DECIMAL(19,4) USING ROUND("totalValue"::numeric, 4),
  ALTER COLUMN "totalCost" TYPE DECIMAL(19,4) USING ROUND("totalCost"::numeric, 4),
  ALTER COLUMN "totalPnl" TYPE DECIMAL(19,4) USING ROUND("totalPnl"::numeric, 4);

COMMIT;
