-- Set default username for user with id 1 when userName is null
UPDATE "User"
SET "userName" = 'user_1'
WHERE id = 1
  AND ("userName" IS NULL OR "userName" = '');
