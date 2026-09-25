import assert from "node:assert/strict";
import test from "node:test";
import { trainingProfileSchema } from "./training-profile-schema.ts";
import { EQUIPMENT_CHOICES, EXPERIENCES, GOALS } from "./training-profile.ts";

const profile = { goal: "build_muscle", experience: "new", daysPerWeek: 3, sessionMinutes: 60, equipment: ["dumbbell"] };

test("profiles accept every goal, experience, duration, and day boundary", () => {
  for (const goal of GOALS) for (const experience of EXPERIENCES) {
    for (const daysPerWeek of [1, 7]) for (const sessionMinutes of [30, 45, 60, 90]) {
      assert.equal(trainingProfileSchema.safeParse({ ...profile, goal, experience, daysPerWeek, sessionMinutes }).success, true);
    }
  }
});

test("profiles reject unknown choices, nonnumeric inputs, fractional or out-of-range days, and injected fields", () => {
  for (const invalid of [
    null, {}, { ...profile, goal: "lose_weight" }, { ...profile, experience: "expert" },
    ...[0, 8, 1.5, "3", NaN, Infinity].map((daysPerWeek) => ({ ...profile, daysPerWeek })),
    ...[0, 15, 31, 120, "60"].map((sessionMinutes) => ({ ...profile, sessionMinutes })),
    { ...profile, userId: "someone-else" }, { ...profile, completed: true },
  ]) assert.equal(trainingProfileSchema.safeParse(invalid).success, false);
});

test("equipment must be nonempty, unique and known, and normalizes to catalog category order", () => {
  for (const equipment of [[], ["bodyweight"], ["dumbbell", "dumbbell"], [...EQUIPMENT_CHOICES, "cable"], "barbell"]) {
    assert.equal(trainingProfileSchema.safeParse({ ...profile, equipment }).success, false);
  }
  assert.deepEqual(trainingProfileSchema.parse({ ...profile, equipment: [...EQUIPMENT_CHOICES].reverse() }).equipment, EQUIPMENT_CHOICES);
  assert.deepEqual(trainingProfileSchema.parse({ ...profile, equipment: ["cable", "dumbbell"] }).equipment, ["dumbbell", "cable"]);
});
