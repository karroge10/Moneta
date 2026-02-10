-- AlterEnum
ALTER TYPE "AssetType" ADD VALUE 'property';
ALTER TYPE "AssetType" ADD VALUE 'custom';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "userId" INTEGER,
ADD COLUMN "manualPrice" DECIMAL(18,8),
ALTER COLUMN "ticker" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Asset_userId_idx" ON "Asset"("userId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
