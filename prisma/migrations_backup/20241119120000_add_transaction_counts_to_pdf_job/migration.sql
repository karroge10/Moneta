DO $$
BEGIN
  -- Create User table if it does not exist (shadow DB safety)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'User'
  ) THEN
    CREATE TABLE "User" (
      "id" SERIAL PRIMARY KEY,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  END IF;

  -- Create table if it does not exist (for shadow databases without prior migrations)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'PdfProcessingJob'
  ) THEN
    CREATE TABLE "PdfProcessingJob" (
      "id" TEXT PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      "status" TEXT NOT NULL,
      "progress" INTEGER NOT NULL DEFAULT 0,
      "processedCount" INTEGER,
      "totalCount" INTEGER,
      "fileContent" BYTEA NOT NULL,
      "fileName" TEXT NOT NULL,
      "result" JSONB,
      "error" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" TIMESTAMP(3),
      CONSTRAINT "PdfProcessingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX "PdfProcessingJob_userId_idx" ON "PdfProcessingJob"("userId");
    CREATE INDEX "PdfProcessingJob_status_idx" ON "PdfProcessingJob"("status");
    CREATE INDEX "PdfProcessingJob_createdAt_idx" ON "PdfProcessingJob"("createdAt");
  END IF;

  -- Add columns if they are missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PdfProcessingJob' AND column_name = 'processedCount'
  ) THEN
    ALTER TABLE "PdfProcessingJob" ADD COLUMN "processedCount" INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PdfProcessingJob' AND column_name = 'totalCount'
  ) THEN
    ALTER TABLE "PdfProcessingJob" ADD COLUMN "totalCount" INTEGER;
  END IF;
END $$;

