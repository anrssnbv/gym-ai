import { EXERCISES, getExercise, type Equipment, type Exercise, type ExerciseId, type Pattern, type MuscleHeadId } from "./catalog.ts";

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
  auto: "Uses your weekly schedule and recent training.",
  push: "Chest, shoulders, triceps.",
  pull: "Back, biceps, rear delts.",
  legs: "Quads, hamstrings, glutes, calves, abs.",
  upper: "Push and pull together.",
  full_body: "A bit of everything.",
};

export const DURATIONS_MIN = [60, 90, 120] as const;

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

export function candidateExercises(focus: Focus, equipment?: Equipment[]): Exercise[] {
  return EXERCISES.filter((exercise) => FOCUS_PATTERNS[focus].includes(exercise.pattern) &&
    (equipment === undefined || equipment.includes(exercise.equipment)));
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

export function resolveProfileAutoFocus(lastTrained: Parameters<typeof resolveAutoFocus>[0], daysPerWeek: number): Focus {
  return daysPerWeek <= 3 ? "full_body" : resolveAutoFocus(lastTrained);
}

export function planTargets(focus: Focus, durationMin: (typeof DURATIONS_MIN)[number]) {
  if (focus === "full_body") return {
    minExercises: 8, maxExercises: 10, minSets: 1, maxSets: 2,
    minTotalSets: 9, maxTotalSets: durationMin === 60 ? 12 : 20,
    targetTotalSets: { 60: 10, 90: 15, 120: 20 }[durationMin],
  };
  if (focus === "upper") return {
    minExercises: 6, maxExercises: 8, minSets: 1, maxSets: 3,
    minTotalSets: 9, maxTotalSets: durationMin === 60 ? 12 : 24,
    targetTotalSets: { 60: 10, 90: 15, 120: 20 }[durationMin],
  };
  return {
    minExercises: 4, maxExercises: 5, minSets: durationMin === 60 ? 2 : 3, maxSets: 3,
    minTotalSets: durationMin === 60 ? 8 : 12, maxTotalSets: 15,
    targetTotalSets: durationMin === 60 ? 10 : 15,
  };
}

export function exerciseTiming(exercise: Exercise) {
  // ponytail: catalog complexity approximates difficulty; add individual overrides only when measured.
  const setMinutes = !exercise.compound ? 2 : ["machine", "cable"].includes(exercise.equipment) ? 2.5 : 3;
  return { setMinutes, restMinutes: setMinutes + 1 };
}

export function estimatePlanMinutes(plan: WorkoutPlan): number {
  return plan.exercises.reduce((minutes, { exerciseId, sets }) => {
    const { setMinutes, restMinutes } = exerciseTiming(getExercise(exerciseId)!);
    return minutes + sets * (setMinutes + restMinutes);
  }, 0);
}

export function coverageRequirements(focus: Focus, candidates: Exercise[]) {
  const requirements: { name: string; heads: MuscleHeadId[]; allowSecondary: boolean }[] = [];
  const add = (name: string, heads: MuscleHeadId[], fallback = false) => requirements.push({
    name, heads, allowSecondary: fallback && !candidates.some(e => e.primary.some(h => heads.includes(h))),
  });
  if (["push", "upper", "full_body"].includes(focus)) {
    add("chest", ["chest-upper", "chest-middle", "chest-lower"]);
    add("shoulders", ["delts-front", "delts-side", "delts-rear"]);
    add("triceps", ["triceps-long", "triceps-lateral", "triceps-medial"], true);
  }
  if (["pull", "upper", "full_body"].includes(focus)) {
    add("upper back", ["back-lats", "back-mid"]);
    add("biceps", ["biceps-long", "biceps-short", "brachialis"], true);
  }
  if (focus === "pull") add("rear delts", ["delts-rear"], true);
  if (["legs", "full_body"].includes(focus)) {
    add("knee-dominant legs", ["quads-rectus", "quads-lateral", "quads-medial"]);
    add("hamstrings", ["hams-outer", "hams-inner"]);
  }
  return requirements;
}

export function hasPlanCoverage(focus: Focus, selected: Exercise[], candidates = selected): boolean {
  return coverageRequirements(focus, candidates).every(({ heads, allowSecondary }) =>
    selected.some(e => [...e.primary, ...(allowSecondary ? e.secondary : [])].some(h => heads.includes(h))));
}

export function canPlanWorkout(focus: Focus, durationMin: (typeof DURATIONS_MIN)[number], equipment: Equipment[]): boolean {
  const candidates = candidateExercises(focus, equipment);
  const targets = planTargets(focus, durationMin);
  if (candidates.length < targets.minExercises || !hasPlanCoverage(focus, candidates)) return false;
  const cheapest = candidates.map(e => { const t = exerciseTiming(e); return t.setMinutes + t.restMinutes; }).sort((a, b) => a - b);
  const minimumMinutes = cheapest.slice(0, targets.minExercises).reduce((sum, minutes) => sum + minutes * targets.minSets, 0)
    + Math.max(0, targets.minTotalSets - targets.minExercises * targets.minSets) * cheapest[0];
  return minimumMinutes <= durationMin;
}

export function isValidPlanSelection(plan: WorkoutPlan, durationMin: (typeof DURATIONS_MIN)[number], equipment?: Equipment[]): boolean {
  const candidates = candidateExercises(plan.focus, equipment);
  const ids = new Set(candidates.map(({ id }) => id));
  const targets = planTargets(plan.focus, durationMin);
  const totalSets = plan.exercises.reduce((sum, e) => sum + e.sets, 0);
  return plan.exercises.length >= targets.minExercises && plan.exercises.length <= targets.maxExercises
    && new Set(plan.exercises.map(e => e.exerciseId)).size === plan.exercises.length
    && plan.exercises.every(e => ids.has(e.exerciseId) && Number.isInteger(e.sets) && e.sets >= targets.minSets && e.sets <= targets.maxSets)
    && totalSets >= targets.minTotalSets && totalSets <= targets.maxTotalSets
    && (plan.focus !== "full_body" || plan.exercises.every(e =>
      plan.exercises.filter(other => getExercise(other.exerciseId)!.groupId === getExercise(e.exerciseId)!.groupId).length <= 2))
    && hasPlanCoverage(plan.focus, plan.exercises.map(e => getExercise(e.exerciseId)!), candidates)
    && estimatePlanMinutes(plan) <= durationMin;
}
