"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generatePlan } from "@/lib/ai";
import type { ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import { getExercise } from "@/lib/catalog";
import { Prisma } from "@/lib/generated/prisma/client";
import { sessionEnd } from "@/lib/game";
import { findOpenSession, getPlanningContext } from "@/lib/queries";
import { DAILY_PLAN_LIMIT, DURATIONS_MIN, FOCUS_CHOICES, candidateExercises, canPlanWorkout, isValidPlanSelection, planTargets, replacementExercises, resolveProfileAutoFocus, type WorkoutPlan } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { planOutputSchema, workoutPlanSchema } from "@/lib/plan-schema";
import { storedTrainingProfileSchema, trainingProfileSelect } from "@/lib/training-profile-schema";
import { serializableTransaction } from "@/lib/transactions";

const durationSchema = z.union(DURATIONS_MIN.map((duration) => z.literal(duration)));
const generationSchema = z.object({
  durationMin: durationSchema,
  focus: z.enum(FOCUS_CHOICES),
});
const dailyLimit = { ok: false, error: "Daily limit reached (10 plans). Try again tomorrow." } as const;
const generationError = { ok: false, error: "Couldn't generate a workout. Try again." } as const;
const configurationError = { ok: false, error: "AI coach is not configured." } as const;
const startSchema = z.object({ plan: workoutPlanSchema, durationMin: durationSchema });
const missingProfile = { ok: false, error: "Complete your Training preferences before generating a workout." } as const;
const stalePlan = { ok: false, error: "Your workout changed on another screen. Review the plan and try again.", stale: true } as const;
const swapSchema = z.object({
  sessionId: z.string().min(1).max(100),
  stepIndex: z.number().int().min(0).max(9),
  expectedExerciseId: z.string().min(1).max(80),
  replacementId: z.string().min(1).max(80),
});
const idSchema = z.string().min(1).max(100);
const repeatSchema = z.object({ savedWorkoutId: idSchema, requestId: z.uuid() });
const activeRepeatError = "Finish your current workout before starting this saved plan.";

export async function saveWorkout(input: unknown): Promise<ActionResult<{ savedWorkoutId: string }>> {
  const userId = await requireUserId();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const source = await prisma.workoutSession.findFirst({ where: { id: parsed.data, userId }, select: { endedAt: true, plan: true } });
  if (!source?.endedAt) return { ok: false, error: "Finish this workout before saving it." };
  const plan = workoutPlanSchema.safeParse(source.plan);
  if (!plan.success) return { ok: false, error: "This workout has no valid generated plan to save." };
  const saved = await prisma.savedWorkout.upsert({
    where: { userId_sourceSessionId: { userId, sourceSessionId: parsed.data } },
    create: { userId, sourceSessionId: parsed.data, plan: plan.data },
    update: {},
    select: { id: true },
  });
  revalidatePath("/", "layout");
  return { ok: true, data: { savedWorkoutId: saved.id } };
}

export async function removeSavedWorkout(input: unknown): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const removed = await prisma.savedWorkout.deleteMany({ where: { id: parsed.data, userId } });
  if (!removed.count) return { ok: false, error: "Saved workout not found." };
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function startSavedWorkout(input: unknown): Promise<ActionResult<{ sessionId: string }>> {
  const userId = await requireUserId();
  const parsed = repeatSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { savedWorkoutId, requestId } = parsed.data;
  let result: ActionResult<{ sessionId: string }>;
  try {
    result = await serializableTransaction<{ sessionId: string }>(async (tx) => {
      const previous = await tx.workoutSession.findFirst({ where: { userId, repeatRequestId: requestId }, select: { id: true } });
      if (previous) return { ok: true, data: { sessionId: previous.id } };
      const saved = await tx.savedWorkout.findFirst({ where: { id: savedWorkoutId, userId }, select: { plan: true } });
      if (!saved) return { ok: false, error: "Saved workout not found." };
      const now = new Date();
      const active = await findOpenSession(tx, userId, now);
      if (active && !active.stale) return { ok: false, error: activeRepeatError };
      const parsedPlan = workoutPlanSchema.safeParse(saved.plan);
      if (!parsedPlan.success) return { ok: false, error: "This saved workout is no longer valid." };
      const plan = parsedPlan.data;
      const profile = storedTrainingProfileSchema.safeParse(await tx.trainingProfile.findUnique({ where: { userId }, select: trainingProfileSelect }));
      if (!profile.success) return missingProfile;
      const missing = plan.exercises.map(({ exerciseId }) => getExercise(exerciseId)!)
        .find((exercise) => !profile.data.equipment.includes(exercise.equipment));
      if (missing) return { ok: false, error: `${missing.name} needs ${missing.equipment}. Update Training preferences to start this plan.` };
      if (!DURATIONS_MIN.some((duration) => isValidPlanSelection(plan, duration, profile.data.equipment))) {
        return { ok: false, error: "This saved workout no longer meets the workout rules." };
      }
      if (active) await tx.workoutSession.update({ where: { id: active.id, userId }, data: { endedAt: sessionEnd(active.lastActivityAt, now) } });
      const created = await tx.workoutSession.create({ data: { userId, plan, repeatRequestId: requestId, startedAt: now }, select: { id: true } });
      return { ok: true, data: { sessionId: created.id } };
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    const previous = await prisma.workoutSession.findFirst({ where: { userId, repeatRequestId: requestId }, select: { id: true } });
    if (!previous) return { ok: false, error: "Your workout changed on another screen. Try again." };
    result = { ok: true, data: { sessionId: previous.id } };
  }
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function swapPlannedExercise(input: unknown): Promise<ActionResult<null>> {
  const userId = await requireUserId();
  const parsed = swapSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { sessionId, stepIndex, expectedExerciseId, replacementId } = parsed.data;
  if (!getExercise(expectedExerciseId) || !getExercise(replacementId)) return { ok: false, error: "Invalid input" };
  const result = await serializableTransaction(async (tx) => {
    const active = await findOpenSession(tx, userId, new Date());
    if (!active || active.id !== sessionId || active.stale) return stalePlan;
    const row = await tx.workoutSession.findFirst({ where: { id: sessionId, userId, endedAt: null }, select: { plan: true } });
    const planResult = workoutPlanSchema.safeParse(row?.plan);
    if (!planResult.success) return stalePlan;
    const plan = planResult.data;
    const currentId = plan.exercises[stepIndex]?.exerciseId;
    if (currentId === replacementId && expectedExerciseId !== replacementId) return { ok: true, data: null };
    if (currentId !== expectedExerciseId) return stalePlan;
    const savedSets = await tx.setLog.count({ where: { userId, sessionId, exerciseId: expectedExerciseId } });
    if (savedSets) return { ok: false, error: "This exercise already has a saved set. Keep it in your workout." };
    const profile = storedTrainingProfileSchema.safeParse(await tx.trainingProfile.findUnique({ where: { userId }, select: trainingProfileSelect }));
    if (!profile.success) return { ok: false, error: "Update Training preferences before swapping exercises." };
    if (!replacementExercises(plan, stepIndex, profile.data.equipment).some(({ id }) => id === replacementId)) {
      return { ok: false, error: "This replacement is no longer available. Choose another exercise." };
    }
    const exercises = plan.exercises.map((step, index) => index === stepIndex
      ? { ...step, exerciseId: replacementId, note: "See the movement guide for technique." }
      : step);
    const updated = workoutPlanSchema.safeParse({ ...plan, exercises });
    if (!updated.success) return { ok: false, error: "This replacement does not fit the workout plan." };
    await tx.workoutSession.update({ where: { id: sessionId, userId }, data: { plan: updated.data } });
    return { ok: true, data: null };
  });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function startWorkout(input: unknown): Promise<ActionResult<{ sessionId: string }>> {
  const userId = await requireUserId();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { plan, durationMin } = parsed.data;
  const result = await serializableTransaction<{ sessionId: string }>(async (tx) => {
    const profile = storedTrainingProfileSchema.safeParse(await tx.trainingProfile.findUnique({ where: { userId }, select: trainingProfileSelect }));
    if (!profile.success) return missingProfile;
    if (!isValidPlanSelection(plan, durationMin, profile.data.equipment)) {
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
    if (!canPlanWorkout(focus, durationMin, profile.equipment)) return { ok: false, error: "Not enough exercises for this focus and equipment. Choose another focus or update Training preferences." };
    const limits = planTargets(focus, durationMin);
    if (!process.env.OPENAI_API_KEY || /[\s\p{Cc}]/u.test(process.env.OPENAI_API_KEY)) return configurationError;
    stage = "quota";
    if (await prisma.planGeneration.count({ where }) >= DAILY_PLAN_LIMIT) return dailyLimit;
    // Recheck and reserve atomically so concurrent requests cannot exceed the limit.
    const reservation = await serializableTransaction(async (tx) => {
      if (await tx.planGeneration.count({ where }) >= DAILY_PLAN_LIMIT) return dailyLimit;
      await tx.planGeneration.create({ data: { userId } });
      return { ok: true, data: null };
    });
    if (!reservation.ok) return reservation;
    for (let attempt = 0; attempt < 2; attempt++) {
      stage = "provider";
      const output = await generatePlan({ focus, durationMin, context: { ...context, profile } });
      stage = "validation";
      const selection = planOutputSchema(candidates.map(({ id }) => id), limits.maxExercises, limits.maxSets, limits.minExercises, limits.minSets)
        .safeParse(output);
      if (!selection.success) continue;
      const plan = { ...selection.data, focus };
      if (isValidPlanSelection(plan, durationMin, profile.equipment)) return { ok: true, data: plan };
    }
    return generationError;
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
