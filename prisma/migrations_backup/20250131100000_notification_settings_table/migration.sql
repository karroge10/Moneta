-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "upcomingBills" BOOLEAN NOT NULL DEFAULT true,
    "upcomingIncome" BOOLEAN NOT NULL DEFAULT true,
    "investments" BOOLEAN NOT NULL DEFAULT true,
    "goals" BOOLEAN NOT NULL DEFAULT true,
    "promotionalEmail" BOOLEAN NOT NULL DEFAULT true,
    "aiInsights" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");

-- CreateIndex
CREATE INDEX "UserNotificationSettings_userId_idx" ON "UserNotificationSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate: copy from User.notificationSettings if column exists, else insert defaults for all users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'notificationSettings'
  ) THEN
    EXECUTE 'INSERT INTO "UserNotificationSettings" ("userId", "pushNotifications", "upcomingBills", "upcomingIncome", "investments", "goals", "promotionalEmail", "aiInsights")
    SELECT
      id,
      COALESCE((("notificationSettings"->>''pushNotifications'')::boolean), true),
      COALESCE((("notificationSettings"->>''upcomingBills'')::boolean), true),
      COALESCE((("notificationSettings"->>''upcomingIncome'')::boolean), true),
      COALESCE((("notificationSettings"->>''investments'')::boolean), true),
      COALESCE((("notificationSettings"->>''goals'')::boolean), true),
      COALESCE((("notificationSettings"->>''promotionalEmail'')::boolean), true),
      COALESCE((("notificationSettings"->>''aiInsights'')::boolean), true)
    FROM "User"';
  ELSE
    INSERT INTO "UserNotificationSettings" ("userId", "pushNotifications", "upcomingBills", "upcomingIncome", "investments", "goals", "promotionalEmail", "aiInsights")
    SELECT id, true, true, true, true, true, true, true FROM "User";
  END IF;
END $$;

-- Drop column from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "notificationSettings";
