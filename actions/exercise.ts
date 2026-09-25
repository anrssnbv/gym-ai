"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { getExercise } from "@/lib/catalog";
import { applySet, calibrate, roundKg, REPS_LIMITS, STEP_LIMITS_KG, WEIGHT_LIMITS_KG, type LevelState } from "@/lib/game";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { findOpenSession, getLevelState } from "@/lib/queries";
import { serializableTransaction } from "@/lib/transactions";

const exerciseSchema = z.object({ exerciseId: z.string() });
const weightSchema = exerciseSchema.extend({
  weightKg: z.number().min(WEIGHT_LIMITS_KG.min).max(WEIGHT_LIMITS_KG.max),
  stepKg: z.number().min(STEP_LIMITS_KG.min).max(STEP_LIMITS_KG.max),
});
const setSchema = exerciseSchema.extend({
  setId: z.string().min(16).max(64),
  reps: z.number().int().min(REPS_LIMITS.min).max(REPS_LIMITS.max),
  expectedLevel: z.number().int().min(1),
});
const staleResult = { ok: false, error: "Your level changed on another screen. Start a new round.", stale: true } as const;
class StaleLevel extends Error {}
class SetIdConflict extends Error {}

interface LoggedSet {
  state: LevelState;
  leveledUp: boolean;
  sessionId: string;
}

async function savedState(userId: string, exerciseId: string): Promise<LevelState> {
  const state = await getLevelState(userId, exerciseId);
  if (!state) throw new Error("Saved exercise progress is missing");
  return state;
}

async function replay(db: Prisma.TransactionClient, userId: string, input: z.infer<typeof setSchema>) {
  const set = await db.setLog.findFirst({ where: { id: input.setId, userId } });
  if (!set) return null;
  if (set.exerciseId !== input.exerciseId || set.reps !== input.reps || set.level !== input.expectedLevel) {
    return { ok: false, error: "Invalid input" } as const;
  }
  return { ok: true, data: { leveledUp: set.leveledUp, sessionId: set.sessionId } } as const;
}

export async function calibrateExercise(input: unknown): Promise<ActionResult<LevelState>> {
  const userId = await requireUserId();
  const parsed = weightSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { exerciseId, weightKg, stepKg } = parsed.data;
  if (!getExercise(exerciseId)) return { ok: false, error: "Unknown exercise" };
  const { level, weightKg: weight, stepKg: step, startWeightKg } = calibrate(weightKg, stepKg);
  try {
    await prisma.exerciseProgress.upsert({
      where: { userId_exerciseId: { userId, exerciseId } },
      create: { userId, exerciseId, level, weightKg: weight, stepKg: step, startWeightKg },
      update: {},
    });
  } catch (error) {
    // An emulated upsert can lose the first-calibration race. Only accept our own saved row.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002"
      || !(await prisma.exerciseProgress.findFirst({ where: { userId, exerciseId } }))) throw error;
  }
  revalidatePath("/", "layout");
  return { ok: true, data: await savedState(userId, exerciseId) };
}

export async function adjustExercise(input: unknown): Promise<ActionResult<LevelState>> {
  const userId = await requireUserId();
  const parsed = weightSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { exerciseId, weightKg, stepKg } = parsed.data;
  if (!getExercise(exerciseId)) return { ok: false, error: "Unknown exercise" };
  const { count } = await prisma.exerciseProgress.updateMany({
    where: { userId, exerciseId },
    data: { weightKg: roundKg(weightKg), stepKg: roundKg(stepKg) },
  });
  if (!count) return { ok: false, error: "Calibrate this exercise first" };
  revalidatePath("/", "layout");
  return { ok: true, data: await savedState(userId, exerciseId) };
}

export async function logSet(input: unknown): Promise<ActionResult<LoggedSet>> {
  const userId = await requireUserId();
  const parsed = setSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { setId, exerciseId, reps, expectedLevel } = parsed.data;
  if (!getExercise(exerciseId)) return { ok: false, error: "Unknown exercise" };
  let result: ActionResult<{ leveledUp: boolean; sessionId: string }>;
  try {
    result = await serializableTransaction(async (tx) => {
      const previous = await replay(tx, userId, parsed.data);
      if (previous) return previous;
      const row = await tx.exerciseProgress.findFirst({ where: { userId, exerciseId } });
      if (!row) return { ok: false, error: "Calibrate this exercise first" };
      if (row.level !== expectedLevel) return staleResult;
      const now = new Date();
      let session = await findOpenSession(tx, userId, now);
      if (session?.stale) {
        await tx.workoutSession.update({
          where: { id: session.id, userId },
          data: { endedAt: session.lastActivityAt },
        });
        session = null;
      }
      const sessionId = session?.id ?? (await tx.workoutSession.create({ data: { userId } })).id;
      const { state, leveledUp } = applySet({ ...row, bestRepsAtLevel: 0 }, reps);
      try {
        await tx.setLog.create({
          data: { id: setId, userId, sessionId, exerciseId, reps, level: row.level, weightKg: row.weightKg, leveledUp },
        });
      } catch (error) {
        // SetLog's only unique constraint is its primary key. Recover only insert collisions.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new SetIdConflict();
        throw error;
      }
      if (leveledUp) {
        const { count } = await tx.exerciseProgress.updateMany({
          where: { id: row.id, userId, level: expectedLevel },
          data: { level: state.level, weightKg: state.weightKg },
        });
        if (!count) throw new StaleLevel();
      }
      return { ok: true, data: { leveledUp, sessionId } };
    });
  } catch (error) {
    if (!(error instanceof StaleLevel) && !(error instanceof SetIdConflict)) throw error;
    result = await replay(prisma, userId, parsed.data)
      ?? (error instanceof StaleLevel ? staleResult : { ok: false, error: "Invalid input" });
  }
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  return { ok: true, data: { ...result.data, state: await savedState(userId, exerciseId) } };
}

export async function undoLastSet(input: unknown): Promise<ActionResult<LevelState>> {
  const userId = await requireUserId();
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { exerciseId } = parsed.data;
  if (!getExercise(exerciseId)) return { ok: false, error: "Unknown exercise" };
  const result = await serializableTransaction(async (tx) => {
    const set = await tx.setLog.findFirst({
      where: { userId, exerciseId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    if (!set) return { ok: false, error: "Nothing to undo" };
    await tx.setLog.delete({ where: { id: set.id, userId } });
    if (set.leveledUp) {
      await tx.exerciseProgress.updateMany({
        where: { userId, exerciseId },
        data: { level: set.level, weightKg: set.weightKg },
      });
    }
    return { ok: true, data: null };
  });
  if (!result.ok) return result;
  revalidatePath("/", "layout");
  return { ok: true, data: await savedState(userId, exerciseId) };
}
