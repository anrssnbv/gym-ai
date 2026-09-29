import test from "node:test";
import assert from "node:assert/strict";
import { workoutProgress } from "./workout-progress.ts";

test("planned completion counts saved sets, caps each exercise, and separates extras", () => {
  const plan = [{ exerciseId: "squat", sets: 2 }, { exerciseId: "curl", sets: 1 }];
  assert.equal(workoutProgress(plan, []).completed, 0);
  const saved = ["squat", "squat", "squat", "press", "curl"].map((exerciseId, id) => ({ exerciseId, id }));
  const progress = workoutProgress(plan, saved);
  assert.equal(progress.completed, 3);
  assert.equal(progress.total, 3);
  assert.deepEqual(progress.steps.map((step) => step.done), [2, 1]);
  assert.deepEqual(progress.extras.map((set) => set.id), [2, 3]);
  assert.equal(workoutProgress(plan, saved.slice(0, -1)).completed, 2);
});
