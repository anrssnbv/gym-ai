import assert from "node:assert/strict";
import test from "node:test";
import {
  candidateExercises, dedupeExercises, isValidPlanSelection, maxExercises, resolveAutoFocus,
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

test("auto focus picks never trained patterns first, then oldest, with stable ties", () => {
  const latest = new Date("2026-09-25T12:00:00Z");
  const oldest = new Date("2026-09-20T12:00:00Z");
  assert.equal(resolveAutoFocus({}), "push");
  assert.equal(resolveAutoFocus({ push: latest }), "pull");
  assert.equal(resolveAutoFocus({ push: latest, pull: latest, legs: oldest }), "legs");
  assert.equal(resolveAutoFocus({ push: latest, pull: latest, legs: latest }), "push");
});

test("duration caps match 30, 45, 60 and 90 minutes", () => {
  assert.deepEqual([maxExercises(30), maxExercises(45), maxExercises(60), maxExercises(90)], [4, 5, 6, 8]);
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

test("deduplication keeps the first occurrence without changing the input", () => {
  const duplicate = { ...plan.exercises[0], sets: 5, note: "Duplicate." };
  const original = { ...plan, exercises: [...plan.exercises, duplicate] };
  assert.deepEqual(dedupeExercises(original), plan);
  assert.equal(original.exercises.length, 4);
});

for (const calibratedCount of [0, 1, 2]) {
  test(`selection allows a three-exercise plan with ${calibratedCount} calibrated candidates`, () => {
    const levels = Object.fromEntries(plan.exercises.slice(0, calibratedCount).map(({ exerciseId }) => [exerciseId, 1]));
    assert.equal(isValidPlanSelection(plan, levels), true);
    assert.equal(isValidPlanSelection({
      ...plan,
      exercises: [...plan.exercises, { exerciseId: "face-pull", sets: 2, note: "Keep control." }],
    }, levels), false);
  });
}

test("selection counts only calibrated focus candidates and rejects off-focus exercises", () => {
  assert.equal(isValidPlanSelection(plan, { "leg-press": 2, "barbell-back-squat": 3 }), true);
  assert.equal(isValidPlanSelection({
    ...plan,
    exercises: [{ exerciseId: "leg-press", sets: 3, note: "Keep control." }, ...plan.exercises.slice(1)],
  }, {}), false);
  assert.equal(isValidPlanSelection({ ...plan, exercises: plan.exercises.slice(0, 2) }, {}), false);
});
