import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISES, MUSCLE_GROUPS, getExercise, getExercisesByGroup } from "./catalog.ts";

test("exercise IDs are unique", () => {
  assert.equal(new Set(EXERCISES.map((exercise) => exercise.id)).size, EXERCISES.length);
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
