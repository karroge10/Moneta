-- The production database was changed with `db push` at some point, so the migration
-- history no longer built the same schema on a fresh database. This brings a fresh
-- database in line with production. Every statement is guarded, so on production,
-- which already has this shape, the migration changes nothing.

DROP TABLE IF EXISTS "CategoriesCustom";

DROP INDEX IF EXISTS "User_userName_key";

ALTER TABLE "User"
  DROP COLUMN IF EXISTS "defaultPage",
  DROP COLUMN IF EXISTS "firstName",
  DROP COLUMN IF EXISTS "lastName",
  DROP COLUMN IF EXISTS "plan",
  DROP COLUMN IF EXISTS "userName";

ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "icon" TEXT;
