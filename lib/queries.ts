import type { Prisma } from "@/lib/generated/prisma/client";
import { isSessionStale, type LevelState } from "@/lib/game";
import { prisma } from "@/lib/prisma";

export async function findOpenSession(db: Prisma.TransactionClient, userId: string, now: Date) {
  const session = await db.workoutSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      startedAt: true,
      sets: {
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { createdAt: true },
      },
      _count: { select: { sets: { where: { userId } } } },
    },
  });
  if (!session) return null;
  const lastActivityAt = session.sets[0]?.createdAt ?? session.startedAt;
  return {
    id: session.id,
    startedAt: session.startedAt,
    lastActivityAt,
    setCount: session._count.sets,
    stale: isSessionStale(lastActivityAt, now),
  };
}

export async function getActiveSession(userId: string, now = new Date()) {
  const session = await findOpenSession(prisma, userId, now);
  return session?.stale ? null : session;
}

export async function getLevelState(userId: string, exerciseId: string): Promise<LevelState | null> {
  const row = await prisma.exerciseProgress.findFirst({ where: { userId, exerciseId } });
  if (!row) return null;
  const { _max } = await prisma.setLog.aggregate({
    where: { userId, exerciseId, level: row.level, weightKg: row.weightKg },
    _max: { reps: true },
  });
  return {
    level: row.level,
    weightKg: row.weightKg,
    stepKg: row.stepKg,
    startWeightKg: row.startWeightKg,
    bestRepsAtLevel: _max.reps ?? 0,
  };
}

export async function getProgressMap(userId: string): Promise<Record<string, { level: number; weightKg: number }>> {
  const rows = await prisma.exerciseProgress.findMany({
    where: { userId },
    select: { exerciseId: true, level: true, weightKg: true },
  });
  return Object.fromEntries(rows.map(({ exerciseId, level, weightKg }) => [exerciseId, { level, weightKg }]));
}

export async function getRecentSets(userId: string, exerciseId: string, take = 10) {
  return prisma.setLog.findMany({
    where: { userId, exerciseId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: { id: true, createdAt: true, weightKg: true, reps: true, level: true, leveledUp: true },
  });
}

export async function getSessionDetail(userId: string, sessionId: string) {
  return prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      sets: {
        where: { userId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true, exerciseId: true, weightKg: true, reps: true,
          level: true, leveledUp: true, createdAt: true,
        },
      },
    },
  });
}
