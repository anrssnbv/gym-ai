import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISES, MUSCLE_GROUPS, getExercise, getExercisesByGroup } from "./catalog.ts";
import { WEIGHT_MIN_KG } from "./game.ts";

test("exercise IDs are unique", () => {
  assert.equal(new Set(EXERCISES.map((exercise) => exercise.id)).size, EXERCISES.length);
});

test("all 50 exercises define valid individual progression limits", () => {
  assert.equal(EXERCISES.length, 50);
  for (const exercise of EXERCISES) {
    assert.ok(Number.isFinite(exercise.maxWeightKg), exercise.id);
    assert.ok(exercise.maxWeightKg >= WEIGHT_MIN_KG, exercise.id);
  }
  assert.equal(getExercise("barbell-bench-press")?.maxWeightKg, 200);
  assert.equal(getExercise("barbell-curl")?.maxWeightKg, 80);
  assert.equal(getExercise("incline-dumbbell-curl")?.maxWeightKg, 30);
  assert.equal(getExercise("leg-press")?.maxWeightKg, 600);
});

test("primary heads exist and do not overlap secondary heads", () => {
  for (const exercise of EXERCISES) {
    assert.ok(exercise.primary.length > 0, exercise.id);
    for (const head of exercise.primary) {
      assert.ok(!(exercise.secondary as readonly string[]).includes(head), `${exercise.id}: ${head}`);
    }
  }
});

test("every head is primary in at least one exercise", () => {
  const covered = new Set(EXERCISES.flatMap((exercise) => exercise.primary));
  for (const group of MUSCLE_GROUPS) {
    for (const head of group.heads) assert.ok(covered.has(head), head);
  }
});

test("every group has at least three exercises", () => {
  for (const group of MUSCLE_GROUPS) {
    assert.ok(getExercisesByGroup(group.id).length >= 3, group.id);
  }
});

test("unknown IDs return undefined", () => {
  assert.equal(getExercise("nope"), undefined);
  assert.equal(getExercisesByGroup("nope"), undefined);
});
