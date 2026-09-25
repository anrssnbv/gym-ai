import type { ExerciseId } from "./catalog.ts";

export const FOCUSES = ["push", "pull", "legs", "upper", "full_body"] as const;
export type Focus = (typeof FOCUSES)[number];
export type FocusChoice = Focus | "auto";
export const FOCUS_CHOICES: FocusChoice[] = ["auto", ...FOCUSES];

export const FOCUS_LABELS: Record<FocusChoice, string> = {
  auto: "Auto",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper body",
  full_body: "Full body",
};

export const FOCUS_HINTS: Record<FocusChoice, string> = {
  auto: "Picks push, pull or legs — whichever you trained longest ago.",
  push: "Chest, shoulders, triceps.",
  pull: "Back, biceps, rear delts.",
  legs: "Quads, hamstrings, glutes, calves, abs.",
  upper: "Push and pull together.",
  full_body: "A bit of everything.",
};

export const DURATIONS_MIN = [30, 45, 60, 90] as const;

export interface WorkoutPlan {
  focus: Focus;
  title: string;
  summary: string;
  exercises: { exerciseId: ExerciseId; sets: number; note: string }[];
}
