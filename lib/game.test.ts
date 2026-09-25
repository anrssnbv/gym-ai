import assert from "node:assert/strict";
import test from "node:test";
import {
  adjust, applySet, calibrate, formatKg, isSessionStale, powerLevel,
  roundSeconds, SESSION_IDLE_MS, sessionEnd, sessionEndAt, type LevelState,
} from "./game.ts";

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

test("12 reps levels up and adds the step, while 11 does not", () => {
  assert.deepEqual(applySet(state, 12), {
    state: { ...state, level: 5, weightKg: 45, bestRepsAtLevel: 0 },
    leveledUp: true,
  });
  assert.deepEqual(applySet(state, 11), {
    state: { ...state, bestRepsAtLevel: 11 },
    leveledUp: false,
  });
  assert.equal(state.bestRepsAtLevel, 9);
});

test("30 reps levels up exactly one level", () => {
  assert.deepEqual(applySet(state, 30), {
    state: { ...state, level: 5, weightKg: 45, bestRepsAtLevel: 0 },
    leveledUp: true,
  });
});

test("best reps track the maximum below 12 and reset after a level-up", () => {
  let current = calibrate(20, 2.5);
  for (const [reps, best] of [[8, 8], [6, 8], [11, 11], [10, 11], [12, 0], [5, 5]]) {
    current = applySet(current, reps).state;
    assert.equal(current.bestRepsAtLevel, best);
  }
});

test("three level-ups round a 1.1 kg step to exactly 23.3 kg", () => {
  let current = calibrate(20, 1.1);
  for (let round = 0; round < 3; round++) {
    current = applySet(current, 12).state;
  }
  assert.equal(current.weightKg, 23.3);
  assert.equal(current.level, 4);
});

test("roundSeconds returns two minutes for compound and one for isolation", () => {
  assert.equal(roundSeconds(true), 120);
  assert.equal(roundSeconds(false), 60);
});

test("sessions become stale only after three hours without activity", () => {
  const lastActivityAt = new Date("2026-09-25T08:00:00Z");
  assert.equal(SESSION_IDLE_MS, 10_800_000);
  assert.equal(isSessionStale(lastActivityAt, new Date("2026-09-25T10:59:59.999Z")), false);
  assert.equal(isSessionStale(lastActivityAt, new Date("2026-09-25T11:00:00Z")), false);
  assert.equal(isSessionStale(lastActivityAt, new Date("2026-09-25T11:00:00.001Z")), true);
});

test("sessionEnd uses last activity when stale and now otherwise", () => {
  const lastActivityAt = new Date("2026-09-25T08:00:00Z");
  const activeNow = new Date("2026-09-25T11:00:00Z");
  const staleNow = new Date("2026-09-25T11:00:00.001Z");
  assert.equal(sessionEnd(lastActivityAt, activeNow), activeNow);
  assert.equal(sessionEnd(lastActivityAt, staleNow), lastActivityAt);
});

test("sessionEndAt prefers the stored end and otherwise follows session activity", () => {
  const lastActivityAt = new Date("2026-09-25T08:00:00Z");
  const endedAt = new Date("2026-09-25T09:00:00Z");
  const activeNow = new Date("2026-09-25T10:00:00Z");
  const staleNow = new Date("2026-09-25T12:00:00Z");
  assert.equal(sessionEndAt(endedAt, lastActivityAt, activeNow), endedAt);
  assert.equal(sessionEndAt(endedAt, lastActivityAt, staleNow), endedAt);
  assert.equal(sessionEndAt(null, lastActivityAt, activeNow), activeNow);
  assert.equal(sessionEndAt(null, lastActivityAt, staleNow), lastActivityAt);
});

test("powerLevel sums earned levels above level one", () => {
  assert.equal(powerLevel([]), 0);
  assert.equal(powerLevel([1, 1]), 0);
  assert.equal(powerLevel([3, 1, 5]), 6);
});
