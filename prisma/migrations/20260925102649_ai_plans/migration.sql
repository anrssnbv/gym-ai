-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "plan" JSONB;

-- CreateTable
CREATE TABLE "PlanGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanGeneration_userId_createdAt_idx" ON "PlanGeneration"("userId", "createdAt");
