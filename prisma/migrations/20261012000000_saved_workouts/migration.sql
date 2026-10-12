ALTER TABLE "WorkoutSession" ADD COLUMN "repeatRequestId" TEXT;
CREATE UNIQUE INDEX "WorkoutSession_repeatRequestId_key" ON "WorkoutSession"("repeatRequestId");

CREATE TABLE "SavedWorkout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceSessionId" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedWorkout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SavedWorkout_userId_sourceSessionId_key" ON "SavedWorkout"("userId", "sourceSessionId");
CREATE INDEX "SavedWorkout_userId_createdAt_idx" ON "SavedWorkout"("userId", "createdAt");
