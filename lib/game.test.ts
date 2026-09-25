import assert from "node:assert/strict";
import test from "node:test";
import { adjust, calibrate, formatKg, type LevelState } from "./game.ts";

test("calibrate starts level 1 with rounded weight and step", () => {
  assert.deepEqual(calibrate(42.506, 2.504), {
    level: 1,
    weightKg: 42.51,
    stepKg: 2.5,
    startWeightKg: 42.51,
    bestRepsAtLevel: 0,
  });
});

const state: LevelState = {
  level: 4,
  weightKg: 42.5,
  stepKg: 2.5,
  startWeightKg: 35,
  bestRepsAtLevel: 9,
};

test("adjust preserves the level and start weight, resetting best reps for a changed weight", () => {
  assert.deepEqual(adjust(state, 45.006, 1.254), {
    ...state,
    weightKg: 45.01,
    stepKg: 1.25,
    bestRepsAtLevel: 0,
  });
  assert.equal(state.bestRepsAtLevel, 9);
});

test("adjust preserves best reps when only the step changes", () => {
  assert.deepEqual(adjust(state, 42.5, 1.25), { ...state, stepKg: 1.25 });
});

test("adjust compares rounded weights before resetting best reps", () => {
  assert.deepEqual(adjust(state, 42.504, 2.5), state);
});

test("formatKg omits trailing zeros and floating point noise", () => {
  assert.equal(formatKg(40), "40 kg");
  assert.equal(formatKg(42.5), "42.5 kg");
  assert.equal(formatKg(23.75), "23.75 kg");
  assert.equal(formatKg(0.1 + 0.2), "0.3 kg");
});
