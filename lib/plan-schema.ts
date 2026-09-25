import { z } from "zod";
import { EXERCISES, type ExerciseId } from "./catalog.ts";
import { FOCUSES, candidateExercises, type WorkoutPlan } from "./plan.ts";

export function planOutputSchema(ids: readonly ExerciseId[], max: number, maxSets = 5) {
  return z.object({
    title: z.string().min(1).max(60),
    summary: z.string().min(1).max(240),
    exercises: z.array(z.object({
      exerciseId: z.enum(ids),
      sets: z.number().int().min(1).max(maxSets),
      note: z.string().min(1).max(120),
    })).min(3).max(max),
  });
}

export const workoutPlanSchema = planOutputSchema(EXERCISES.map(({ id }) => id), 8)
  .extend({ focus: z.enum(FOCUSES) })
  .refine((plan) => new Set(plan.exercises.map(({ exerciseId }) => exerciseId)).size === plan.exercises.length,
    { message: "Exercises must be unique", path: ["exercises"] })
  .refine((plan) => {
    const candidates = new Set(candidateExercises(plan.focus).map(({ id }) => id));
    return plan.exercises.every(({ exerciseId }) => candidates.has(exerciseId));
  }, { message: "Exercises must match the workout focus", path: ["exercises"] }) satisfies z.ZodType<WorkoutPlan>;
