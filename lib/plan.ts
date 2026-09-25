import { EXERCISES, type Exercise, type ExerciseId, type Pattern } from "./catalog.ts";

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

export const DAILY_PLAN_LIMIT = 10;

export const FOCUS_PATTERNS: Record<Focus, Pattern[]> = {
  push: ["push"],
  pull: ["pull"],
  legs: ["legs", "core"],
  upper: ["push", "pull"],
  full_body: ["push", "pull", "legs", "core"],
};

export function candidateExercises(focus: Focus): Exercise[] {
  return EXERCISES.filter((exercise) => FOCUS_PATTERNS[focus].includes(exercise.pattern));
}

export function resolveAutoFocus(
  lastTrained: Partial<Record<"push" | "pull" | "legs", Date>>,
): "push" | "pull" | "legs" {
  const patterns = ["push", "pull", "legs"] as const;
  return patterns.reduce((oldest, pattern) =>
    (lastTrained[pattern]?.getTime() ?? -Infinity) <
    (lastTrained[oldest]?.getTime() ?? -Infinity) ? pattern : oldest,
  );
}

export function maxExercises(durationMin: (typeof DURATIONS_MIN)[number]): number {
  return { 30: 4, 45: 5, 60: 6, 90: 8 }[durationMin];
}

export function dedupeExercises(plan: WorkoutPlan): WorkoutPlan {
  const seen = new Set<ExerciseId>();
  return {
    ...plan,
    exercises: plan.exercises.filter(({ exerciseId }) => {
      if (seen.has(exerciseId)) return false;
      seen.add(exerciseId);
      return true;
    }),
  };
}

export function isValidPlanSelection(plan: WorkoutPlan, levels: Record<string, number>): boolean {
  const candidates = candidateExercises(plan.focus);
  const ids = new Set(candidates.map(({ id }) => id));
  if (plan.exercises.length < 3 || plan.exercises.some(({ exerciseId }) => !ids.has(exerciseId))) {
    return false;
  }

  const calibratedCount = candidates.filter(({ id }) => levels[id] != null).length;
  const newLimit = calibratedCount >= 2 ? 1 : 3 - calibratedCount;
  return plan.exercises.filter(({ exerciseId }) => levels[exerciseId] == null).length <= newLimit;
}
