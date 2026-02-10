-- Ensure userName column exists (fix for shadow db recreation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'userName'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "userName" TEXT;
  END IF;
END $$;

-- Set default username for user with id 1 when userName is null
UPDATE "User"
SET "userName" = 'user_1'
WHERE id = 1
  AND ("userName" IS NULL OR "userName" = '');
