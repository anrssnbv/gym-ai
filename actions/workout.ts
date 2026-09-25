"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generatePlan } from "@/lib/ai";
import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { sessionEnd } from "@/lib/game";
import { findOpenSession, getPlanningContext } from "@/lib/queries";
import { DAILY_PLAN_LIMIT, DURATIONS_MIN, FOCUS_CHOICES, dedupeExercises, isValidPlanSelection, resolveAutoFocus, type WorkoutPlan } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { workoutPlanSchema } from "@/lib/plan-schema";
import { serializableTransaction } from "@/lib/transactions";

const generationSchema = z.object({
  durationMin: z.union(DURATIONS_MIN.map((duration) => z.literal(duration))),
  focus: z.enum(FOCUS_CHOICES),
});
const dailyLimit = { ok: false, error: "Daily limit reached (10 plans). Try again tomorrow." } as const;
const generationError = { ok: false, error: "Couldn't generate a workout. Try again." } as const;
const startSchema = z.object({ plan: workoutPlanSchema });

export async function startWorkout(input: unknown): Promise<ActionResult<{ sessionId: string }>> {
  const userId = await requireUserId();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { plan } = parsed.data;
  const result = await serializableTransaction<{ sessionId: string }>(async (tx) => {
    const now = new Date();
    const session = await findOpenSession(tx, userId, now);
    if (session && !session.stale) {
      await tx.workoutSession.update({ where: { id: session.id, userId }, data: { plan } });
      return { ok: true, data: { sessionId: session.id } };
    }
    if (session) {
      await tx.workoutSession.update({
        where: { id: session.id, userId },
        data: { endedAt: sessionEnd(session.lastActivityAt, now) },
      });
    }
    const created = await tx.workoutSession.create({ data: { userId, plan, startedAt: now }, select: { id: true } });
    return { ok: true, data: { sessionId: created.id } };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function generateWorkout(input: unknown): Promise<ActionResult<WorkoutPlan>> {
  const userId = await requireUserId();
  const parsed = generationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = { userId, createdAt: { gte: since } };
    if (await prisma.planGeneration.count({ where }) >= DAILY_PLAN_LIMIT) return dailyLimit;
    if (!process.env.OPENAI_API_KEY) return { ok: false, error: "AI coach is not configured." };
    const context = await getPlanningContext(userId);
    const { durationMin } = parsed.data;
    const focus = parsed.data.focus === "auto" ? resolveAutoFocus(context.lastTrained) : parsed.data.focus;
    // Recheck and reserve atomically so concurrent requests cannot exceed the limit.
    const reservation = await serializableTransaction(async (tx) => {
      if (await tx.planGeneration.count({ where }) >= DAILY_PLAN_LIMIT) return dailyLimit;
      await tx.planGeneration.create({ data: { userId } });
      return { ok: true, data: null };
    });
    if (!reservation.ok) return reservation;
    const output = await generatePlan({ focus, durationMin, context });
    const plan = dedupeExercises({ focus, ...output });
    if (!isValidPlanSelection(plan, context.levels)) return generationError;
    return { ok: true, data: plan };
  } catch (error) {
    console.error("Workout generation failed", error);
    return generationError;
  }
}

export async function finishWorkout(): Promise<ActionResult<{ sessionId: string | null }>> {
  const userId = await requireUserId();
  const result = await serializableTransaction<{ sessionId: string | null }>(async (tx) => {
    const now = new Date();
    const session = await findOpenSession(tx, userId, now);
    if (!session) return { ok: true, data: { sessionId: null } };
    await tx.workoutSession.update({
      where: { id: session.id, userId },
      data: { endedAt: sessionEnd(session.lastActivityAt, now) },
    });
    return { ok: true, data: { sessionId: session.id } };
  });
  if (result.ok && result.data.sessionId) revalidatePath("/", "layout");
  return result;
}
