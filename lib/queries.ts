import type { Prisma } from "@/lib/generated/prisma/client";
import { isSessionStale, powerLevel, roundKg, sessionEndAt, type LevelState } from "@/lib/game";
import { prisma } from "@/lib/prisma";
import { getExercise, type MuscleGroupId, type MuscleHeadId } from "@/lib/catalog";
import { workoutPlanSchema } from "@/lib/plan-schema";

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

export interface PlanningContext {
  lastTrained: Partial<Record<"push" | "pull" | "legs", Date>>;
  daysSinceGroup: Partial<Record<MuscleGroupId, number>>;
  recentSessions: { daysAgo: number; exercises: { id: string; sets: number; bestReps: number }[] }[];
  levels: Record<string, number>;
}

export async function getPlanningContext(userId: string, now = new Date()): Promise<PlanningContext> {
  const day = 24 * 60 * 60 * 1000;
  const since = new Date(now.getTime() - 30 * day);
  const [sets, progress] = await Promise.all([
    prisma.setLog.findMany({
      where: { userId, session: { userId }, createdAt: { gte: since, lte: now } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { exerciseId: true, reps: true, createdAt: true, sessionId: true, session: { select: { startedAt: true } } },
    }),
    prisma.exerciseProgress.findMany({ where: { userId }, select: { exerciseId: true, level: true } }),
  ]);
  const lastTrained: PlanningContext["lastTrained"] = {};
  const daysSinceGroup: PlanningContext["daysSinceGroup"] = {};
  const sessions = new Map<string, { startedAt: Date; exercises: Map<string, { id: string; sets: number; bestReps: number }> }>();
  for (const set of sets) {
    const exercise = getExercise(set.exerciseId);
    // Sets arrive newest first, so the first occurrence is the latest training date.
    if (exercise) {
      if (exercise.pattern !== "core") lastTrained[exercise.pattern] ??= set.createdAt;
      daysSinceGroup[exercise.groupId] ??= Math.floor((now.getTime() - set.createdAt.getTime()) / day);
    }
    let session = sessions.get(set.sessionId);
    if (!session) {
      session = { startedAt: set.session.startedAt, exercises: new Map() };
      sessions.set(set.sessionId, session);
    }
    const entry = session.exercises.get(set.exerciseId) ?? { id: set.exerciseId, sets: 0, bestReps: 0 };
    entry.sets++;
    entry.bestReps = Math.max(entry.bestReps, set.reps);
    session.exercises.set(set.exerciseId, entry);
  }
  return {
    lastTrained,
    daysSinceGroup,
    recentSessions: [...sessions.entries()]
      .sort(([idA, a], [idB, b]) => b.startedAt.getTime() - a.startedAt.getTime() || idB.localeCompare(idA))
      .slice(0, 3)
      .map(([, session]) => ({
        daysAgo: Math.floor((now.getTime() - session.startedAt.getTime()) / day),
        exercises: [...session.exercises.values()],
      })),
    levels: Object.fromEntries(progress.map(({ exerciseId, level }) => [exerciseId, level])),
  };
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
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      plan: true,
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
  if (!session) return null;
  const parsed = workoutPlanSchema.safeParse(session.plan);
  return { ...session, plan: parsed.success ? parsed.data : null };
}

export async function getActivePlanStep(userId: string, exerciseId: string) {
  const active = await getActiveSession(userId);
  if (!active) return null;
  const session = await getSessionDetail(userId, active.id);
  if (!session || session.endedAt) return null;
  const step = session.plan?.exercises.find((exercise) => exercise.exerciseId === exerciseId);
  if (!step) return null;
  return { done: session.sets.filter((set) => set.exerciseId === exerciseId).length, sets: step.sets };
}

export async function getDashboard(userId: string, now = new Date()) {
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [progress, sessions, volume, weeklySets] = await Promise.all([
    prisma.exerciseProgress.findMany({ where: { userId }, select: { level: true } }),
    prisma.workoutSession.findMany({
      where: { userId, sets: { some: { userId } } },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      select: {
        id: true, startedAt: true, endedAt: true,
        sets: {
          where: { userId },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { createdAt: true },
        },
        _count: { select: { sets: { where: { userId } } } },
      },
    }),
    prisma.$queryRaw<{ volumeKg: number }[]>`
      SELECT COALESCE(SUM("weightKg" * "reps"), 0) AS "volumeKg"
      FROM "SetLog" WHERE "userId" = ${userId}
    `,
    prisma.setLog.groupBy({
      by: ["exerciseId"],
      where: { userId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const finished = sessions
    .filter((session) => session.endedAt !== null || isSessionStale(session.sets[0]?.createdAt ?? session.startedAt, now))
    .map((session) => ({
      id: session.id,
      startedAt: session.startedAt,
      endedAt: sessionEndAt(session.endedAt, session.sets[0]?.createdAt ?? session.startedAt, now),
      setCount: session._count.sets,
    }));
  const recent = finished.slice(0, 5);
  const levelUps = recent.length ? await prisma.setLog.groupBy({
    by: ["sessionId"],
    where: { userId, sessionId: { in: recent.map((session) => session.id) }, leveledUp: true },
    _count: { _all: true },
  }) : [];
  const levelUpsBySession = new Map(levelUps.map((row) => [row.sessionId, row._count._all]));
  const heat: Partial<Record<MuscleHeadId, number>> = {};
  for (const row of weeklySets) {
    for (const head of getExercise(row.exerciseId)?.primary ?? []) {
      heat[head] = (heat[head] ?? 0) + row._count._all;
    }
  }

  return {
    power: powerLevel(progress.map((row) => row.level)),
    unlocked: progress.length,
    workouts: { total: sessions.length, last7Days: sessions.filter((session) => session.startedAt >= since).length },
    timeTrainedMs: finished.reduce((total, session) => total + Math.max(0, session.endedAt.getTime() - session.startedAt.getTime()), 0),
    volumeKg: roundKg(volume[0].volumeKg),
    heat,
    recent: recent.map((session) => ({ ...session, levelUps: levelUpsBySession.get(session.id) ?? 0 })),
  };
}
