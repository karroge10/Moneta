-- IF NOT EXISTS: the baseline already creates these enum values, so a fresh database would fail here otherwise.
-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'property';
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'custom';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "userId" INTEGER,
ADD COLUMN "manualPrice" DECIMAL(18,8),
ALTER COLUMN "ticker" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Asset_userId_idx" ON "Asset"("userId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
