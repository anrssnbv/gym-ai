import { z } from "zod";
import { DURATIONS_MIN } from "./plan.ts";
import { EQUIPMENT_CHOICES, EXPERIENCES, GOALS, type TrainingProfile } from "./training-profile.ts";

// Server validation only; client controls use the constants in training-profile.ts.
export const trainingProfileSchema = z.strictObject({
  goal: z.enum(GOALS),
  experience: z.enum(EXPERIENCES),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.union(DURATIONS_MIN.map((duration) => z.literal(duration))),
  equipment: z.array(z.enum(EQUIPMENT_CHOICES)).min(1).max(4)
    .refine((equipment) => new Set(equipment).size === equipment.length, "Choose each equipment type once.")
    .transform((equipment) => EQUIPMENT_CHOICES.filter((item) => equipment.includes(item))),
}) satisfies z.ZodType<TrainingProfile>;

export const trainingProfileSelect = {
  goal: true,
  experience: true,
  daysPerWeek: true,
  sessionMinutes: true,
  equipment: true,
} as const;
