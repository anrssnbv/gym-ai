// Real PostgreSQL/actions, with authentication and cache invalidation supplied by the test context.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { actionContext } from "./action-context.mjs";

const root = new URL("../", import.meta.url);
const environment = new URL(".env.local", root);
if (existsSync(environment)) process.loadEnvFile(fileURLToPath(environment));
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/auth" || specifier === "next/cache") {
    return { url: new URL("./action-context.mjs", import.meta.url).href, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
  return nextResolve(specifier, context);
} });
const { startWorkout, finishWorkout } = await import("../actions/workout.ts");
const { calibrateExercise, logSet, undoLastSet } = await import("../actions/exercise.ts");
const { getActiveSession, getActivePlanStep, getSessionDetail, getDashboard } = await import("../lib/queries.ts");
const { prisma } = await import("../lib/prisma.ts");
const ids = ["barbell-bench-press", "incline-bench-press", "machine-chest-press"];
const plan = { focus: "push", title: "Push workout", summary: "A balanced push session.", exercises: ids.map(exerciseId => ({ exerciseId, sets: 2, note: "Move with control." })) };
const users = [];
function asUser(run) {
  const state = { userId: `spec15-test-${randomUUID()}`, invalidations: [] };
  users.push(state.userId);
  return actionContext.run(state, () => run(state));
}
function success(result) { assert.equal(result.ok, true, result.error); return result.data; }
const setData = (userId, sessionId, exerciseId = ids[0]) => ({ userId, sessionId, exerciseId, level: 1, weightKg: 20, reps: 8 });

test("planned workout actions and queries against PostgreSQL", async (t) => {
  try {
    await t.test("authentication precedes malformed input validation", () => assert.rejects(() => startWorkout(null), /Integration action needs a test user/));
    await t.test("invalid shape, set count, and unknown catalog ID create no session", () => asUser(async ({ userId, invalidations }) => {
      for (const input of [null, {}, { plan: {} }, { plan: { ...plan, exercises: [{ ...plan.exercises[0], exerciseId: "unknown" }, ...plan.exercises.slice(1)] } }, { plan: { ...plan, exercises: plan.exercises.map(e => ({ ...e, sets: 0 })) } }]) {
        assert.deepEqual(await startWorkout(input), { ok: false, error: "Invalid input" });
      }
      assert.equal(await prisma.workoutSession.count({ where: { userId } }), 0);
      assert.deepEqual(invalidations, []);
    }));
    await t.test("starting creates a persisted zero-set active session without adding dashboard stats", () => asUser(async ({ userId, invalidations }) => {
      const { sessionId } = success(await startWorkout({ plan }));
      const session = await getSessionDetail(userId, sessionId);
      assert.deepEqual(session.plan, plan);
      assert.deepEqual(session.sets, []);
      const active = await getActiveSession(userId);
      assert.equal(active.id, sessionId);
      assert.equal(active.setCount, 0);
      assert.deepEqual(active.lastActivityAt, session.startedAt);
      assert.deepEqual(await getActivePlanStep(userId, ids[0]), { done: 0, sets: 2 });
      assert.equal(await getActivePlanStep(userId, "hammer-curl"), null);
      assert.equal((await getDashboard(userId)).workouts.total, 0);
      assert.deepEqual(invalidations, [["/", "layout"]]);
      assert.equal(await getSessionDetail(users[0], sessionId), null);
      assert.equal(await getActivePlanStep(users[0], ids[0]), null);
    }));
    await t.test("an existing manual workout receives the plan and preserves its sets", () => asUser(async ({ userId }) => {
      const manual = await prisma.workoutSession.create({ data: { userId } });
      await prisma.setLog.create({ data: setData(userId, manual.id) });
      assert.equal(success(await startWorkout({ plan })).sessionId, manual.id);
      assert.equal(await prisma.workoutSession.count({ where: { userId } }), 1);
      assert.deepEqual((await getSessionDetail(userId, manual.id)).plan, plan);
      assert.deepEqual(await getActivePlanStep(userId, ids[0]), { done: 1, sets: 2 });
    }));
    await t.test("stale sessions close at their last activity before a fresh plan starts", () => asUser(async ({ userId }) => {
      const startedAt = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const lastActivity = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const stale = await prisma.workoutSession.create({ data: { userId, startedAt, plan } });
      await prisma.setLog.create({ data: { ...setData(userId, stale.id), createdAt: lastActivity } });
      assert.equal(await getActivePlanStep(userId, ids[0]), null);
      const fresh = success(await startWorkout({ plan }));
      assert.notEqual(fresh.sessionId, stale.id);
      assert.deepEqual((await getSessionDetail(userId, stale.id)).endedAt, lastActivity);
      assert.deepEqual(await getActivePlanStep(userId, ids[0]), { done: 0, sets: 2 });
    }));
    await t.test("stale empty workouts close at their start", () => asUser(async ({ userId }) => {
      const startedAt = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const stale = await prisma.workoutSession.create({ data: { userId, startedAt } });
      success(await startWorkout({ plan }));
      assert.deepEqual((await getSessionDetail(userId, stale.id)).endedAt, startedAt);
    }));
    await t.test("simultaneous starts resolve to one active session", () => asUser(async ({ userId }) => {
      const results = await Promise.all([startWorkout({ plan }), startWorkout({ plan })]);
      assert.equal(success(results[0]).sessionId, success(results[1]).sessionId);
      assert.equal(await prisma.workoutSession.count({ where: { userId } }), 1);
    }));
    await t.test("actual log, undo, completion, and finish retain the plan and update only its counts", () => asUser(async ({ userId }) => {
      const { sessionId } = success(await startWorkout({ plan }));
      success(await calibrateExercise({ exerciseId: ids[0], weightKg: 20, stepKg: 2.5 }));
      const firstId = randomUUID();
      success(await logSet({ setId: firstId, exerciseId: ids[0], reps: 8, expectedLevel: 1 }));
      assert.deepEqual(await getActivePlanStep(userId, ids[0]), { done: 1, sets: 2 });
      success(await undoLastSet({ exerciseId: ids[0] }));
      assert.deepEqual(await getActivePlanStep(userId, ids[0]), { done: 0, sets: 2 });
      for (let i = 0; i < 3; i++) success(await logSet({ setId: randomUUID(), exerciseId: ids[0], reps: 8, expectedLevel: 1 }));
      await prisma.setLog.create({ data: setData(userId, sessionId, "hammer-curl") });
      assert.deepEqual(await getActivePlanStep(userId, ids[0]), { done: 3, sets: 2 });
      assert.equal(await getActivePlanStep(userId, "hammer-curl"), null);
      success(await finishWorkout());
      assert.equal(await getActivePlanStep(userId, ids[0]), null);
      assert.deepEqual((await getSessionDetail(userId, sessionId)).plan, plan);
    }));
    await t.test("null and invalid stored plans fall back to manual workouts", () => asUser(async ({ userId }) => {
      const session = await prisma.workoutSession.create({ data: { userId } });
      assert.equal((await getSessionDetail(userId, session.id)).plan, null);
      await prisma.workoutSession.update({ where: { id: session.id, userId }, data: { plan: { ...plan, exercises: [{ exerciseId: "unknown", sets: 3, note: "Invalid" }] } } });
      assert.equal((await getSessionDetail(userId, session.id)).plan, null);
      assert.equal(await getActivePlanStep(userId, ids[0]), null);
    }));
  } finally {
    await prisma.setLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.workoutSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.exerciseProgress.deleteMany({ where: { userId: { in: users } } });
    await prisma.$disconnect();
  }
});
