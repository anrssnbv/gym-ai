import assert from "node:assert/strict";
import test from "node:test";
import {
  candidateExercises, estimatePlanMinutes, isValidPlanSelection, planTargets, canPlanWorkout, exerciseTiming, replacementExercises, resolveAutoFocus, resolveProfileAutoFocus,
  type WorkoutPlan,
} from "./plan.ts";
import { planOutputSchema, workoutPlanSchema } from "./plan-schema.ts";

const plan: WorkoutPlan = {
  focus: "pull",
  title: "Pull day",
  summary: "A balanced back and biceps session.",
  exercises: (["lat-pulldown", "seated-cable-row", "barbell-curl"] as const).map((exerciseId) => ({
    exerciseId,
    sets: 3,
    note: "Keep the movement controlled.",
  })),
};

test("focus candidates include core for legs and rear delts for upper", () => {
  assert.ok(candidateExercises("legs").some(({ id }) => id === "cable-crunch"));
  assert.ok(candidateExercises("upper").some(({ id }) => id === "face-pull"));
  assert.ok(!candidateExercises("upper").some(({ id }) => id === "leg-press"));
  assert.ok(!candidateExercises("push").some(({ id }) => id === "lat-pulldown"));
});

test("replacement candidates keep group, pattern, equipment, coverage and time", () => {
  const push: WorkoutPlan = { focus: "push", title: "Push", summary: "Push day.", exercises:
    (["machine-chest-press", "machine-shoulder-press", "cable-pushdown", "cable-lateral-raise", "pec-deck"] as const)
      .map((exerciseId) => ({ exerciseId, sets: 2, note: "Control." })) };
  const allowed = replacementExercises(push, 0, ["machine", "cable"]).map(({ id }) => id);
  assert.ok(allowed.includes("wide-chest-press"));
  assert.ok(allowed.includes("cable-crossover"));
  assert.ok(!allowed.includes("barbell-bench-press")); // slower and unavailable
  assert.ok(!allowed.includes("pec-deck")); // already in plan
  assert.deepEqual(replacementExercises(push, 0, ["dumbbell"]), []); // only slower options
  assert.ok(!replacementExercises(push, 1, ["machine"]).some(({ id }) => id === "reverse-pec-deck")); // same group, different pattern
  assert.deepEqual(replacementExercises(push, 99, ["machine"]), []);
});

test("auto focus picks never trained patterns first, then oldest, with stable ties", () => {
  const latest = new Date("2026-09-25T12:00:00Z");
  const oldest = new Date("2026-09-20T12:00:00Z");
  assert.equal(resolveAutoFocus({}), "push");
  assert.equal(resolveAutoFocus({ push: latest }), "pull");
  assert.equal(resolveAutoFocus({ push: latest, pull: latest, legs: oldest }), "legs");
  assert.equal(resolveAutoFocus({ push: latest, pull: latest, legs: latest }), "push");
});

test("planning counts full work and rest cycles, independent of game rounds", () => {
  assert.equal(estimatePlanMinutes(plan), 51);
  assert.equal(estimatePlanMinutes({ ...plan, exercises: [] }), 0);
  assert.equal(estimatePlanMinutes({ ...plan, exercises: [plan.exercises[2]] }), 15);
  for (const exercise of candidateExercises("full_body")) {
    const timing = exerciseTiming(exercise);
    assert.ok(timing.setMinutes >= 2 && timing.setMinutes <= 3);
    assert.ok(timing.restMinutes >= 3 && timing.restMinutes <= 4);
  }
});

test("workout schema accepts a valid plan and rejects invalid IDs, sets and exercise counts", () => {
  assert.deepEqual(workoutPlanSchema.parse(plan), plan);
  for (const exercise of [
    { ...plan.exercises[0], exerciseId: "unknown-exercise" },
    { ...plan.exercises[0], sets: 6 },
    { ...plan.exercises[0], sets: 1.5 },
  ]) {
    assert.equal(workoutPlanSchema.safeParse({ ...plan, exercises: [exercise, ...plan.exercises.slice(1)] }).success, false);
  }
  assert.equal(workoutPlanSchema.safeParse({ ...plan, exercises: plan.exercises.slice(0, 2) }).success, false);
});

test("stored and submitted plans reject duplicate IDs and exercises outside their focus", () => {
  assert.equal(workoutPlanSchema.safeParse({
    ...plan, exercises: [plan.exercises[0], plan.exercises[0], plan.exercises[2]],
  }).success, false);
  for (const focus of ["push", "pull", "legs", "upper", "full_body"] as const) {
    for (const exercise of candidateExercises("full_body")) {
      const others = candidateExercises(focus).filter(({ id }) => id !== exercise.id).slice(0, 2);
      const exercises = [exercise, ...others].map(({ id }) => ({ exerciseId: id, sets: 3, note: "Control." }));
      assert.equal(workoutPlanSchema.safeParse({ ...plan, focus, exercises }).success,
        candidateExercises(focus).some(({ id }) => id === exercise.id), `${focus}: ${exercise.id}`);
    }
  }
});

test("output schema enforces candidate IDs, duration cap and local text limits", () => {
  const schema = planOutputSchema(candidateExercises("pull").map(({ id }) => id), 4);
  assert.equal(schema.safeParse(plan).success, true);
  for (const invalid of [
    { ...plan, title: "" },
    { ...plan, title: "x".repeat(61) },
    { ...plan, summary: "x".repeat(241) },
    { ...plan, exercises: [...plan.exercises, ...plan.exercises] },
    { ...plan, exercises: [{ ...plan.exercises[0], note: "x".repeat(121) }, ...plan.exercises.slice(1)] },
    { ...plan, exercises: [{ ...plan.exercises[0], exerciseId: "leg-press" }, ...plan.exercises.slice(1)] },
  ]) {
    assert.equal(schema.safeParse(invalid).success, false);
  }
});

const fullBody: WorkoutPlan = {
  ...plan, focus: "full_body", exercises: ([
    "barbell-back-squat", "barbell-bench-press", "lat-pulldown", "dumbbell-lateral-raise",
    "barbell-curl", "cable-pushdown", "lying-leg-curl", "standing-calf-raise",
  ] as const).map((exerciseId, i) => ({ exerciseId, sets: i < 2 ? 2 : 1, note: "Control." })),
};

test("full body enforces broad coverage, 8–10 exercises, 9–12 sets and the real time ceiling", () => {
  assert.equal(estimatePlanMinutes(fullBody), 59);
  assert.equal(isValidPlanSelection(fullBody, 60), true);
  const overBudget = { ...fullBody, exercises: fullBody.exercises.map(e => e.exerciseId === "lat-pulldown" ? { ...e, sets: 2 } : e) };
  assert.equal(estimatePlanMinutes(overBudget), 65);
  assert.equal(isValidPlanSelection(overBudget, 60), false);
  assert.equal(isValidPlanSelection({ ...fullBody, exercises: fullBody.exercises.slice(0, 3) }, 60), false);
  assert.equal(isValidPlanSelection({ ...fullBody, exercises: fullBody.exercises.map(e => ({ ...e, sets: 2 })) }, 60), false);
  assert.equal(isValidPlanSelection({ ...fullBody, exercises: fullBody.exercises.map(e => ({ ...e, sets: 1 })) }, 60), false);
  assert.equal(isValidPlanSelection({ ...fullBody, exercises: fullBody.exercises.map(e => e.exerciseId === "lying-leg-curl" ? { ...e, exerciseId: "pec-deck" } : e) }, 60), false);
  assert.equal(isValidPlanSelection({ ...fullBody, exercises: [...fullBody.exercises, fullBody.exercises[0]] }, 60), false);
  assert.equal(isValidPlanSelection(fullBody, 60, ["dumbbell"]), false);
  const shoulderHeavy: WorkoutPlan = { ...fullBody, exercises: [
    ...fullBody.exercises.map(e => ({ ...e, sets: 1 })),
    { exerciseId: "cable-lateral-raise", sets: 1, note: "Control." },
    { exerciseId: "reverse-pec-deck", sets: 1, note: "Control." },
  ] };
  assert.equal(estimatePlanMinutes(shoulderHeavy), 55);
  assert.equal(isValidPlanSelection(shoulderHeavy, 60), false);
  // Historical plans remain readable even when they fail the new generation policy.
  assert.equal(workoutPlanSchema.safeParse(plan).success, true);
  assert.equal(isValidPlanSelection(plan, 60), false);
});

test("long split sessions keep exactly three sets even with 120 minutes available", () => {
  const split: WorkoutPlan = { ...plan, exercises: [...plan.exercises, { exerciseId: "face-pull", sets: 3, note: "Control." }] };
  assert.equal(estimatePlanMinutes(split), 66);
  assert.equal(isValidPlanSelection(split, 60), false);
  assert.equal(isValidPlanSelection(split, 90), true);
  assert.equal(isValidPlanSelection(split, 120), true);
  assert.equal(isValidPlanSelection({ ...split, exercises: split.exercises.map(e => ({ ...e, sets: 4 })) }, 120), false);
  assert.equal(isValidPlanSelection({ ...split, exercises: split.exercises.map(e => ({ ...e, sets: 2 })) }, 90), false);
  assert.equal(isValidPlanSelection({ ...split, exercises: split.exercises.map(e => ({ ...e, sets: 2 })) }, 60), true);
});

test("preflight catches insufficient candidates and missing primary coverage", () => {
  assert.equal(canPlanWorkout("full_body", 60, ["dumbbell"]), true);
  assert.equal(canPlanWorkout("full_body", 60, ["machine"]), false); // Back extension alone cannot cover upper back.
  assert.equal(canPlanWorkout("full_body", 60, ["cable"]), false); // No knee/hamstring work.
  assert.equal(canPlanWorkout("push", 60, ["dumbbell"]), false); // Only three candidates.
  assert.equal(canPlanWorkout("pull", 90, ["barbell"]), false);
  assert.equal(canPlanWorkout("pull", 90, ["cable"]), true);
});

test("shared targets and automatic focus respect schedule without a beginner/calibration cap", () => {
  assert.equal(resolveProfileAutoFocus({}, 3), "full_body");
  assert.equal(resolveProfileAutoFocus({}, 4), "push");
  assert.deepEqual(planTargets("full_body", 60), { minExercises: 8, maxExercises: 10, minSets: 1, maxSets: 2, minTotalSets: 9, maxTotalSets: 12, targetTotalSets: 10 });
  assert.equal(planTargets("full_body", 120).targetTotalSets, 20);
  assert.equal(planTargets("push", 90).minSets, 3);
});
