"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generatePlan } from "@/lib/ai";
import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { sessionEnd } from "@/lib/game";
import { findOpenSession, getPlanningContext } from "@/lib/queries";
import { DAILY_PLAN_LIMIT, DURATIONS_MIN, FOCUS_CHOICES, candidateExercises, dedupeExercises, estimatePlanMinutes, isValidPlanSelection, profilePlanLimits, resolveProfileAutoFocus, type WorkoutPlan } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { planOutputSchema, workoutPlanSchema } from "@/lib/plan-schema";
import { trainingProfileSchema, trainingProfileSelect } from "@/lib/training-profile-schema";
import { serializableTransaction } from "@/lib/transactions";

const generationSchema = z.object({
  durationMin: z.union(DURATIONS_MIN.map((duration) => z.literal(duration))),
  focus: z.enum(FOCUS_CHOICES),
});
const dailyLimit = { ok: false, error: "Daily limit reached (10 plans). Try again tomorrow." } as const;
const generationError = { ok: false, error: "Couldn't generate a workout. Try again." } as const;
const configurationError = { ok: false, error: "AI coach is not configured." } as const;
const startSchema = z.object({ plan: workoutPlanSchema });
const missingProfile = { ok: false, error: "Complete your Training preferences before generating a workout." } as const;

export async function startWorkout(input: unknown): Promise<ActionResult<{ sessionId: string }>> {
  const userId = await requireUserId();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { plan } = parsed.data;
  const result = await serializableTransaction<{ sessionId: string }>(async (tx) => {
    const profile = trainingProfileSchema.safeParse(await tx.trainingProfile.findUnique({ where: { userId }, select: trainingProfileSelect }));
    if (!profile.success) return missingProfile;
    const ids = new Set(candidateExercises(plan.focus, profile.data.equipment).map(({ id }) => id));
    const limits = profilePlanLimits(90, profile.data.experience);
    if (plan.exercises.length > limits.maxExercises || plan.exercises.some(({ exerciseId, sets }) => !ids.has(exerciseId) || sets > limits.maxSets)) {
      return { ok: false, error: "Your Training preferences no longer match this plan. Generate a new workout." };
    }
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
  let stage = "context";
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = { userId, createdAt: { gte: since } };
    const context = await getPlanningContext(userId);
    if (!context.profile) return missingProfile;
    const profile = context.profile;
    const { durationMin } = parsed.data;
    const focus = parsed.data.focus === "auto" ? resolveProfileAutoFocus(context.lastTrained, profile.daysPerWeek) : parsed.data.focus;
    const candidates = candidateExercises(focus, profile.equipment);
    if (candidates.length < 3) return { ok: false, error: "Not enough exercises for this focus and equipment. Choose another focus or update Training preferences." };
    const limits = profilePlanLimits(durationMin, profile.experience);
    if (!process.env.OPENAI_API_KEY || /\s/.test(process.env.OPENAI_API_KEY)) return configurationError;
    stage = "quota";
    if (await prisma.planGeneration.count({ where }) >= DAILY_PLAN_LIMIT) return dailyLimit;
    // Recheck and reserve atomically so concurrent requests cannot exceed the limit.
    const reservation = await serializableTransaction(async (tx) => {
      if (await tx.planGeneration.count({ where }) >= DAILY_PLAN_LIMIT) return dailyLimit;
      await tx.planGeneration.create({ data: { userId } });
      return { ok: true, data: null };
    });
    if (!reservation.ok) return reservation;
    stage = "provider";
    const output = await generatePlan({ focus, durationMin, context: { ...context, profile } });
    stage = "validation";
    const selection = planOutputSchema(candidates.map(({ id }) => id), limits.maxExercises, limits.maxSets)
      .safeParse(dedupeExercises({ ...output, focus }));
    if (!selection.success) return generationError;
    const plan = { ...selection.data, focus };
    if (!isValidPlanSelection(plan, context.levels, profile.equipment) || estimatePlanMinutes(plan) > durationMin) return generationError;
    return { ok: true, data: plan };
  } catch {
    console.error("Workout generation failed", { stage });
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
