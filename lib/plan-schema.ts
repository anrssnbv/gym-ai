import { z } from "zod";
import { EXERCISES, type ExerciseId } from "./catalog.ts";
import { FOCUSES, type WorkoutPlan } from "./plan.ts";

export function planOutputSchema(ids: readonly ExerciseId[], max: number) {
  return z.object({
    title: z.string().min(1).max(60),
    summary: z.string().min(1).max(240),
    exercises: z.array(z.object({
      exerciseId: z.enum(ids),
      sets: z.number().int().min(1).max(5),
      note: z.string().min(1).max(120),
    })).min(3).max(max),
  });
}

export const workoutPlanSchema = planOutputSchema(EXERCISES.map(({ id }) => id), 8)
  .extend({ focus: z.enum(FOCUSES) }) satisfies z.ZodType<WorkoutPlan>;
