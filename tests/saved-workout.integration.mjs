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
  if (specifier === "@/lib/auth" || specifier === "next/cache") return { url: new URL("./action-context.mjs", import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith("@/")) return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
  return nextResolve(specifier, context);
} });
const { saveWorkout, startSavedWorkout, removeSavedWorkout, finishWorkout } = await import("../actions/workout.ts");
const { prisma } = await import("../lib/prisma.ts");
const users = [];
const plan = { focus: "push", title: "Repeat push", summary: "Test plan", exercises: [
  "machine-chest-press", "machine-shoulder-press", "cable-pushdown", "cable-lateral-raise", "pec-deck",
].map((exerciseId) => ({ exerciseId, sets: 2, note: "Move slowly" })) };
const profile = { goal: "build_muscle", experience: "experienced", daysPerWeek: 4, sessionMinutes: 60, equipment: ["machine", "cable"] };
const success = (result) => { assert.equal(result.ok, true, result.error); return result.data; };
async function asUser(run) {
  const userId = `spec21-test-${randomUUID()}`;
  users.push(userId);
  return actionContext.run({ userId, invalidations: [] }, async () => {
    await prisma.trainingProfile.create({ data: { userId, ...profile } });
    return run(userId);
  });
}
async function source(userId, value = plan) {
  return prisma.workoutSession.create({ data: { userId, plan: value, endedAt: new Date() } });
}

test("saved workout actions", async (t) => {
  try {
    await t.test("signed out callers cannot access actions", async () => {
      for (const action of [saveWorkout, startSavedWorkout, removeSavedWorkout]) await assert.rejects(() => action(null), /Integration action needs a test user/);
    });
    await t.test("save is owned, completed, valid and idempotent", () => asUser(async (userId) => {
      const completed = await source(userId);
      const finalPlan = { ...plan, exercises: [{ ...plan.exercises[0], exerciseId: "wide-chest-press" }, ...plan.exercises.slice(1)] };
      await prisma.workoutSession.update({ where: { id: completed.id }, data: { plan: finalPlan } });
      const first = success(await saveWorkout(completed.id));
      assert.deepEqual(success(await saveWorkout(completed.id)), first);
      assert.equal(await prisma.savedWorkout.count({ where: { userId } }), 1);
      assert.deepEqual((await prisma.savedWorkout.findUnique({ where: { id: first.savedWorkoutId } })).plan, finalPlan);
      const open = await prisma.workoutSession.create({ data: { userId, plan } });
      assert.equal((await saveWorkout(open.id)).ok, false);
      const manual = await source(userId, undefined);
      await prisma.workoutSession.update({ where: { id: manual.id }, data: { plan: null } });
      assert.equal((await saveWorkout(manual.id)).ok, false);
      await asUser(async () => assert.equal((await saveWorkout(completed.id)).ok, false));
    }));
    await t.test("repeat creates clean sessions and retries return the same session", () => asUser(async (userId) => {
      const original = await source(userId);
      await prisma.setLog.create({ data: { userId, sessionId: original.id, exerciseId: plan.exercises[0].exerciseId, level: 1, weightKg: 20, reps: 8 } });
      const { savedWorkoutId } = success(await saveWorkout(original.id));
      const requestId = randomUUID();
      const concurrent = await Promise.all([startSavedWorkout({ savedWorkoutId, requestId }), startSavedWorkout({ savedWorkoutId, requestId })]);
      const first = success(concurrent[0]);
      assert.deepEqual(success(concurrent[1]), first);
      assert.deepEqual(success(await startSavedWorkout({ savedWorkoutId, requestId })), first);
      assert.equal(await prisma.setLog.count({ where: { sessionId: first.sessionId } }), 0);
      assert.equal((await prisma.workoutSession.findUnique({ where: { id: first.sessionId } })).plan.title, plan.title);
      assert.equal((await startSavedWorkout({ savedWorkoutId, requestId: randomUUID() })).error, "Finish your current workout before starting this saved plan.");
      success(await finishWorkout());
      assert.deepEqual(success(await startSavedWorkout({ savedWorkoutId, requestId })), first);
      const second = success(await startSavedWorkout({ savedWorkoutId, requestId: randomUUID() }));
      assert.notEqual(first.sessionId, second.sessionId);
      assert.equal(await prisma.setLog.count({ where: { sessionId: second.sessionId } }), 0);
      assert.equal(await prisma.planGeneration.count({ where: { userId } }), 0);
      assert.equal(await prisma.setLog.count({ where: { sessionId: original.id } }), 1);
      success(await removeSavedWorkout(savedWorkoutId));
      assert.equal(await prisma.workoutSession.count({ where: { userId } }), 3);
    }));
    await t.test("unavailable, malformed and foreign plans cannot start", () => asUser(async (userId) => {
      const original = await source(userId);
      const { savedWorkoutId } = success(await saveWorkout(original.id));
      await prisma.trainingProfile.update({ where: { userId }, data: { equipment: ["machine"] } });
      assert.match((await startSavedWorkout({ savedWorkoutId, requestId: randomUUID() })).error, /cable-pushdown|Cable Pushdown|cable-lateral-raise|Cable Lateral Raise/);
      assert.equal(await prisma.savedWorkout.count({ where: { id: savedWorkoutId } }), 1);
      await prisma.savedWorkout.update({ where: { id: savedWorkoutId }, data: { plan: { nonsense: true } } });
      assert.equal((await startSavedWorkout({ savedWorkoutId, requestId: randomUUID() })).ok, false);
      await asUser(async () => {
        assert.equal((await startSavedWorkout({ savedWorkoutId, requestId: randomUUID() })).ok, false);
        assert.equal((await removeSavedWorkout(savedWorkoutId)).ok, false);
      });
      assert.equal(await prisma.workoutSession.count({ where: { userId } }), 1);
    }));
  } finally {
    await prisma.savedWorkout.deleteMany({ where: { userId: { in: users } } });
    await prisma.workoutSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.trainingProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.$disconnect();
  }
});
