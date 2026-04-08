-- CreateTable
CREATE TABLE "LearningLessonProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningLessonProgress_userId_idx" ON "LearningLessonProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningLessonProgress_userId_lessonId_key" ON "LearningLessonProgress"("userId", "lessonId");

-- AddForeignKey
ALTER TABLE "LearningLessonProgress" ADD CONSTRAINT "LearningLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
