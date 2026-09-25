// Uses the configured PostgreSQL database; only unique test-user rows are deleted.
// Node 24 runs the actual TypeScript actions with built-in type stripping.
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
assert.ok(process.env.DATABASE_URL, "Set DATABASE_URL or provide .env.local");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/auth" || specifier === "next/cache") {
      return { url: new URL("./action-context.mjs", import.meta.url).href, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { calibrateExercise, adjustExercise, logSet, undoLastSet } = await import("../actions/exercise.ts");
const { finishWorkout } = await import("../actions/workout.ts");
const { prisma } = await import("../lib/prisma.ts");
const { Prisma } = await import("../lib/generated/prisma/client.ts");
const { serializableTransaction } = await import("../lib/transactions.ts");
const { getActiveSession, getLevelState, getProgressMap, getRecentSets, findOpenSession } = await import("../lib/queries.ts");
const { EXERCISES } = await import("../lib/catalog.ts");
const [exerciseId, secondExercise] = EXERCISES.slice(0, 2).map((exercise) => exercise.id);
const users = [];
const contexts = [];
const success = (result) => {
  assert.equal(result.ok, true, result.error);
  return result.data;
};
const calibration = (id = exerciseId) => ({ exerciseId: id, weightKg: 20, stepKg: 2.5 });
const attempt = (overrides = {}) => ({ setId: randomUUID(), exerciseId, reps: 8, expectedLevel: 1, expectedWeightKg: 20, expectedStepKg: 2.5, ...overrides });

function asNewUser(run) {
  const context = { userId: `spec09-test-${randomUUID()}`, invalidations: [] };
  users.push(context.userId);
  contexts.push(context);
  return actionContext.run(context, () => run(context));
}

test("exercise actions and queries against PostgreSQL", async (t) => {
  try {
    await t.test("every action requires authentication before parsing input", async () => {
      for (const action of [calibrateExercise, adjustExercise, logSet, undoLastSet, finishWorkout]) {
        await assert.rejects(() => action(null), /Integration action needs a test user/);
      }
    });
    await t.test("transaction conflicts retry at most three times; other outcomes do not retry", async (retryTest) => {
      const conflict = new Prisma.PrismaClientKnownRequestError("test conflict", { code: "P2034", clientVersion: "test" });
      const originalTransaction = prisma.$transaction;
      const transaction = retryTest.mock.fn(async () => { throw conflict; });
      prisma.$transaction = transaction;
      try {
        const exhausted = await serializableTransaction(async () => ({ ok: true, data: null }));
        assert.equal(exhausted.ok, false);
        assert.match(exhausted.error, /Try again/);
        assert.equal(transaction.mock.callCount(), 3);
        transaction.mock.resetCalls();
        transaction.mock.mockImplementation(async (run) => {
          if (transaction.mock.callCount() < 2) throw conflict;
          return run(prisma);
        });
        assert.deepEqual(await serializableTransaction(async () => ({ ok: true, data: "saved" })), { ok: true, data: "saved" });
        assert.equal(transaction.mock.callCount(), 3);
        transaction.mock.resetCalls();
        const adapterConflict = new Error("TransactionWriteConflict", {
          cause: { originalCode: "40001", kind: "TransactionWriteConflict" },
        });
        adapterConflict.name = "DriverAdapterError";
        transaction.mock.mockImplementation(async () => { throw adapterConflict; });
        assert.equal((await serializableTransaction(async () => ({ ok: true, data: null }))).ok, false);
        assert.equal(transaction.mock.callCount(), 3);
        transaction.mock.resetCalls();
        transaction.mock.mockImplementation(async (run) => run(prisma));
        assert.deepEqual(await serializableTransaction(async () => ({ ok: false, error: "Invalid input" })), { ok: false, error: "Invalid input" });
        assert.equal(transaction.mock.callCount(), 1);
        transaction.mock.resetCalls();
        const unrelated = new Error("unrelated database failure");
        transaction.mock.mockImplementation(async () => { throw unrelated; });
        await assert.rejects(() => serializableTransaction(async () => ({ ok: true, data: null })), (error) => error === unrelated);
        assert.equal(transaction.mock.callCount(), 1);
      } finally {
        prisma.$transaction = originalTransaction;
      }
    });
    await t.test("validation, missing calibration, and per-user isolation", () => asNewUser(async ({ userId }) => {
      for (const input of [null, { ...calibration(), weightKg: NaN }, { ...calibration(), stepKg: 0 }, { ...calibration(), stepKg: 51 }]) {
        assert.deepEqual(await calibrateExercise(input), { ok: false, error: "Invalid input" });
      }
      assert.deepEqual(await calibrateExercise(calibration("unknown-exercise")), { ok: false, error: "Unknown exercise" });
      for (const input of [{ reps: 1.5 }, { reps: 101 }, { reps: 0 }, { expectedLevel: -1 }, { expectedWeightKg: undefined }, { expectedStepKg: undefined }, { expectedWeightKg: Infinity }, { expectedStepKg: 0 }, { setId: "short" }, { setId: "x".repeat(65) }]) {
        assert.deepEqual(await logSet(attempt(input)), { ok: false, error: "Invalid input" });
      }
      assert.deepEqual(await logSet(attempt()), { ok: false, error: "Calibrate this exercise first" });
      assert.deepEqual(await adjustExercise(calibration()), { ok: false, error: "Calibrate this exercise first" });
      assert.deepEqual(await undoLastSet({ exerciseId }), { ok: false, error: "Invalid input" });
      const absentId = randomUUID();
      assert.deepEqual(success(await undoLastSet({ exerciseId, setId: absentId })), { setId: absentId, state: null });
      assert.deepEqual(success(await finishWorkout()), { sessionId: null });
      const first = success(await calibrateExercise(calibration()));
      assert.deepEqual(success(await calibrateExercise({ ...calibration(), weightKg: 90 })), first);
      const saved = attempt();
      success(await logSet(saved));
      await asNewUser(async ({ userId: other }) => {
        assert.equal(await getLevelState(other, exerciseId), null);
        assert.deepEqual(await getProgressMap(other), {});
        assert.deepEqual(await getRecentSets(other, exerciseId), []);
        assert.equal(await getActiveSession(other), null);
        success(await calibrateExercise(calibration()));
        assert.deepEqual(await logSet(saved), { ok: false, error: "Invalid input" });
        success(await undoLastSet({ exerciseId, setId: saved.setId }));
        assert.equal(await prisma.workoutSession.count({ where: { userId: other } }), 0);
      });
      assert.equal((await getRecentSets(userId, exerciseId)).length, 1);
    }));

    await t.test("concurrent calibration returns the same existing progress", () => asNewUser(async ({ userId }) => {
      const results = await Promise.all([calibrateExercise(calibration()), calibrateExercise({ ...calibration(), weightKg: 30 })]);
      assert.deepEqual(success(results[0]), success(results[1]));
      assert.equal(await prisma.exerciseProgress.count({ where: { userId, exerciseId } }), 1);
    }));

    await t.test("calibration recovers only a unique conflict with this user's existing progress", () => asNewUser(async () => {
      const existing = success(await calibrateExercise(calibration()));
      const originalUpsert = prisma.exerciseProgress.upsert;
      const conflict = new Prisma.PrismaClientKnownRequestError("test duplicate", { code: "P2002", clientVersion: "test" });
      prisma.exerciseProgress.upsert = async () => { throw conflict; };
      try {
        assert.deepEqual(success(await calibrateExercise(calibration())), existing);
        await asNewUser(async () => {
          await assert.rejects(() => calibrateExercise(calibration()), (error) => error === conflict);
        });
      } finally {
        prisma.exerciseProgress.upsert = originalUpsert;
      }
    }));

    await t.test("adjust preserves level and start weight; best reps follow current weight and level", () => asNewUser(async ({ userId }) => {
      success(await calibrateExercise(calibration()));
      success(await logSet(attempt({ reps: 7 })));
      success(await logSet(attempt({ reps: 10 })));
      assert.equal((await getLevelState(userId, exerciseId)).bestRepsAtLevel, 10);
      const adjusted = success(await adjustExercise({ ...calibration(), weightKg: 22.345, stepKg: 1.255 }));
      assert.deepEqual(adjusted, { level: 1, weightKg: 22.35, stepKg: 1.26, startWeightKg: 20, bestRepsAtLevel: 0 });
      const restored = success(await adjustExercise(calibration()));
      assert.equal(restored.bestRepsAtLevel, 10);
      const lastSet = attempt({ reps: 12 });
      const advanced = success(await logSet(lastSet));
      assert.equal(advanced.state.level, 2);
      assert.equal(advanced.state.bestRepsAtLevel, 0);
      assert.deepEqual(await getProgressMap(userId), { [exerciseId]: { level: 2, weightKg: 22.5 } });
      assert.equal((await getRecentSets(userId, exerciseId, 2)).length, 2);
      const undone = success(await undoLastSet({ exerciseId, setId: lastSet.setId })).state;
      assert.equal(undone.level, 1);
      assert.equal(undone.weightKg, 20);
      assert.equal(undone.bestRepsAtLevel, 10);
    }));

    await t.test("simultaneous retries save one set, level up once, and reject changed payloads", () => asNewUser(async ({ userId, invalidations }) => {
      success(await calibrateExercise(calibration()));
      const input = attempt({ reps: 12 });
      const results = await Promise.all([logSet(input), logSet(input)]);
      const first = success(results[0]);
      assert.deepEqual(success(results[1]), first);
      assert.equal(first.state.level, 2);
      assert.equal(first.leveledUp, true);
      assert.equal(await prisma.setLog.count({ where: { userId } }), 1);
      assert.equal(await prisma.workoutSession.count({ where: { userId, endedAt: null } }), 1);
      assert.deepEqual(success(await logSet(input)), first);
      for (const changed of [{ reps: 11 }, { exerciseId: secondExercise }, { expectedLevel: 2 }, { expectedWeightKg: 30 }]) {
        assert.deepEqual(await logSet({ ...input, ...changed }), { ok: false, error: "Invalid input" });
      }
      const stale = await logSet(attempt());
      assert.equal(stale.ok, false);
      assert.equal(stale.stale, true);
      assert.equal(invalidations.length, 4);
    }));

    await t.test("concurrent first sets share one session", () => asNewUser(async ({ userId }) => {
      success(await calibrateExercise(calibration()));
      success(await calibrateExercise(calibration(secondExercise)));
      const results = await Promise.all([logSet(attempt()), logSet(attempt({ exerciseId: secondExercise }))]);
      assert.equal(success(results[0]).sessionId, success(results[1]).sessionId);
      const session = await getActiveSession(userId);
      assert.equal(session.setCount, 2);
      assert.equal(await prisma.workoutSession.count({ where: { userId, endedAt: null } }), 1);
    }));

    await t.test("Finish racing with a set has a serial outcome", () => asNewUser(async ({ userId }) => {
      success(await calibrateExercise(calibration()));
      const initial = success(await logSet(attempt()));
      const [finish, logged] = await Promise.all([finishWorkout(), logSet(attempt())]);
      assert.equal(success(finish).sessionId, initial.sessionId);
      const next = success(logged);
      const sessions = await prisma.workoutSession.findMany({ where: { userId } });
      const closed = sessions.find((session) => session.id === initial.sessionId);
      assert.ok(closed.endedAt);
      if (next.sessionId === initial.sessionId) {
        assert.equal(sessions.length, 1);
        assert.equal(await getActiveSession(userId), null);
      } else {
        assert.equal(sessions.length, 2);
        assert.equal((await getActiveSession(userId)).id, next.sessionId);
      }
      assert.equal(await prisma.setLog.count({ where: { userId } }), 2);
    }));

    await t.test("stale reads do not write; next set and Finish close at last activity", () => asNewUser(async ({ userId }) => {
      success(await calibrateExercise(calibration()));
      const old = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const empty = await prisma.workoutSession.create({ data: { userId, startedAt: old } });
      assert.equal(await getActiveSession(userId), null);
      assert.equal((await findOpenSession(prisma, userId, new Date())).lastActivityAt.getTime(), old.getTime());
      assert.equal((await prisma.workoutSession.findFirst({ where: { id: empty.id, userId } })).endedAt, null);
      const input = attempt();
      const saved = success(await logSet(input));
      assert.notEqual(saved.sessionId, empty.id);
      assert.equal((await prisma.workoutSession.findFirst({ where: { id: empty.id, userId } })).endedAt.getTime(), old.getTime());
      await prisma.workoutSession.update({ where: { id: saved.sessionId, userId }, data: { startedAt: new Date(old.getTime() - 1000) } });
      await prisma.setLog.update({ where: { id: input.setId, userId }, data: { createdAt: old } });
      assert.equal(await getActiveSession(userId), null);
      assert.equal(success(await finishWorkout()).sessionId, saved.sessionId);
      assert.equal((await prisma.workoutSession.findFirst({ where: { id: saved.sessionId, userId } })).endedAt.getTime(), old.getTime());
      success(await undoLastSet({ exerciseId, setId: input.setId }));
      assert.equal(await prisma.setLog.count({ where: { userId } }), 0);
    }));
    await t.test("a changed weight or step makes a captured round stale without writes", () => asNewUser(async ({ userId }) => {
      success(await calibrateExercise(calibration()));
      const captured = attempt({ reps: 12 });
      for (const changed of [{ weightKg: 40, stepKg: 2.5 }, { weightKg: 20, stepKg: 5 }]) {
        success(await adjustExercise({ exerciseId, ...changed }));
        const result = await logSet(captured);
        assert.equal(result.ok, false);
        assert.equal(result.stale, true);
        assert.equal(await prisma.setLog.count({ where: { userId } }), 0);
        assert.equal(await prisma.workoutSession.count({ where: { userId } }), 0);
        assert.equal((await getLevelState(userId, exerciseId)).level, 1);
      }
      success(await adjustExercise(calibration()));
      success(await logSet(captured));
      success(await adjustExercise({ ...calibration(), weightKg: 50, stepKg: 5 }));
      const replayed = success(await logSet(captured));
      assert.equal(replayed.state.weightKg, 50);
      assert.equal(replayed.state.level, 2);
      assert.equal(await prisma.setLog.count({ where: { userId } }), 1);
      assert.equal((await getRecentSets(userId, exerciseId))[0].weightKg, 20);
    }));

    await t.test("Undo targets the displayed newest set and an identical retry never removes another", () => asNewUser(async ({ userId }) => {
      success(await calibrateExercise(calibration()));
      const first = attempt();
      success(await logSet(first));
      const latest = attempt({ reps: 12 });
      success(await logSet(latest));
      const stale = await undoLastSet({ exerciseId, setId: first.setId });
      assert.equal(stale.ok, false);
      assert.equal(stale.stale, true);
      assert.equal(await prisma.setLog.count({ where: { userId } }), 2);
      const undone = success(await undoLastSet({ exerciseId, setId: latest.setId }));
      assert.equal(undone.state.level, 1);
      const next = attempt({ reps: 9 });
      success(await logSet(next));
      const retried = success(await undoLastSet({ exerciseId, setId: latest.setId }));
      assert.equal(retried.state.level, 1);
      assert.equal(await prisma.setLog.count({ where: { userId } }), 2);
      assert.equal((await getRecentSets(userId, exerciseId))[0].id, next.setId);
      success(await undoLastSet({ exerciseId: secondExercise, setId: next.setId }));
      assert.equal(await prisma.setLog.count({ where: { userId } }), 2);
    }));

    await t.test("concurrent Undo retries roll back a level only once", () => asNewUser(async ({ userId }) => {
      success(await calibrateExercise(calibration()));
      const first = attempt();
      success(await logSet(first));
      const latest = attempt({ reps: 12 });
      success(await logSet(latest));
      const target = { exerciseId, setId: latest.setId };
      const results = await Promise.all([undoLastSet(target), undoLastSet(target)]);
      for (const result of results) assert.equal(success(result).state.level, 1);
      assert.equal(await prisma.setLog.count({ where: { userId } }), 1);
      assert.equal((await getRecentSets(userId, exerciseId))[0].id, first.setId);
    }));

    await t.test("each exercise bounds calibration, Adjust and progression; capped sets replay and undo", () => asNewUser(async ({ userId }) => {
      for (const [id, max] of [[exerciseId, 200], ["barbell-curl", 80], ["leg-press", 600]]) {
        const input = { exerciseId: id, weightKg: max - 2.5, stepKg: 2.5 };
        assert.equal((await calibrateExercise({ ...input, weightKg: max + 0.5 })).ok, false);
        success(await calibrateExercise(input));
        assert.equal((await adjustExercise({ ...input, weightKg: max + 0.5 })).ok, false);
        const exact = attempt({ exerciseId: id, expectedWeightKg: max - 2.5, reps: 12 });
        assert.equal(success(await logSet(exact)).state.weightKg, max);
        const blocked = attempt({ exerciseId: id, expectedLevel: 2, expectedWeightKg: max, reps: 15 });
        const result = success(await logSet(blocked));
        assert.equal(result.leveledUp, false);
        assert.equal(result.limitReached, true);
        assert.equal(result.state.weightKg, max);
        assert.equal(result.state.level, 2);
        assert.equal(result.state.bestRepsAtLevel, 15);
        assert.deepEqual(success(await logSet(blocked)), result);
        assert.equal((await getRecentSets(userId, id)).length, 2);
        success(await undoLastSet({ exerciseId: id, setId: blocked.setId }));
        assert.equal((await getLevelState(userId, id)).level, 2);
        success(await undoLastSet({ exerciseId: id, setId: exact.setId }));
        assert.equal((await getLevelState(userId, id)).weightKg, max - 2.5);
      }
    }));

    await t.test("legacy above-limit loads stay loggable and allow only unchanged-weight edits", () => asNewUser(async ({ userId }) => {
      await prisma.exerciseProgress.create({ data: { userId, exerciseId, weightKg: 220, stepKg: 5, startWeightKg: 220 } });
      const stepOnly = success(await adjustExercise({ exerciseId, weightKg: 220, stepKg: 2.5 }));
      assert.equal(stepOnly.weightKg, 220);
      for (const weightKg of [221, 210]) assert.equal((await adjustExercise({ exerciseId, weightKg, stepKg: 2.5 })).ok, false);
      const capped = attempt({ expectedWeightKg: 220, reps: 12 });
      assert.equal(success(await logSet(capped)).limitReached, true);
      assert.equal((await getRecentSets(userId, exerciseId))[0].weightKg, 220);
      success(await adjustExercise({ ...calibration(), weightKg: 200 }));
      assert.equal((await adjustExercise({ ...calibration(), weightKg: 220 })).ok, false);
      assert.equal(success(await logSet(capped)).limitReached, true);
      assert.equal(await prisma.setLog.count({ where: { userId } }), 1);
    }));

    for (const context of contexts) {
      for (const invalidation of context.invalidations) assert.deepEqual(invalidation, ["/", "layout"]);
    }
  } finally {
    try {
      for (const userId of users) {
        await prisma.setLog.deleteMany({ where: { userId } });
        await prisma.workoutSession.deleteMany({ where: { userId } });
        await prisma.exerciseProgress.deleteMany({ where: { userId } });
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
