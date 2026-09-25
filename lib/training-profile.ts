import type { Equipment } from "./catalog.ts";
import type { DURATIONS_MIN } from "./plan.ts";

export const GOALS = ["build_muscle", "get_stronger", "general_fitness", "weight_management"] as const;
export const EXPERIENCES = ["new", "beginner", "regular", "experienced"] as const;
export const EQUIPMENT_CHOICES = ["barbell", "dumbbell", "machine", "cable"] as const satisfies readonly Equipment[];

export interface TrainingProfile {
  goal: (typeof GOALS)[number];
  experience: (typeof EXPERIENCES)[number];
  daysPerWeek: number;
  sessionMinutes: (typeof DURATIONS_MIN)[number];
  equipment: Equipment[];
}

export const GOAL_LABELS: Record<TrainingProfile["goal"], string> = {
  build_muscle: "Build muscle",
  get_stronger: "Get stronger",
  general_fitness: "General fitness",
  weight_management: "Support weight management",
};

export const EXPERIENCE_LABELS: Record<TrainingProfile["experience"], string> = {
  new: "New to gym training",
  beginner: "Some experience — less than 6 months",
  regular: "6 months to 2 years",
  experienced: "More than 2 years",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbells",
  machine: "Machines",
  cable: "Cables",
};
