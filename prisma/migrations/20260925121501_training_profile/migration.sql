-- CreateTable
CREATE TABLE "TrainingProfile" (
    "userId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "sessionMinutes" INTEGER NOT NULL,
    "equipment" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProfile_pkey" PRIMARY KEY ("userId")
);
