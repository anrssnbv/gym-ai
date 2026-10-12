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
const { prisma } = await import("../lib/prisma.ts");
const { getActiveSession, getPreviousExerciseSession } = await import("../lib/queries.ts");
const { calibrateExercise, adjustExercise, logSet, undoLastSet } = await import("../actions/exercise.ts");
const { finishWorkout } = await import("../actions/workout.ts");
const userId = `spec22-test-${randomUUID()}`;
const otherUser = `spec22-other-${randomUUID()}`;
const exerciseId = "barbell-bench-press";
const now = Date.now();
const ago = (minutes) => new Date(now - minutes * 60_000);
const success = (result) => { assert.equal(result.ok, true, result.error); return result.data; };
const set = (sessionId, overrides = {}) => ({ userId, sessionId, exerciseId, weightKg: 20, reps: 8, level: 1, ...overrides });

test("previous exercise session is owned, ordered and stable", async () => {
  try {
    assert.equal(await getPreviousExerciseSession(userId, exerciseId, null), null);
    const oldest = await prisma.workoutSession.create({ data: { userId, startedAt: ago(3000), endedAt: ago(2950) } });
    await prisma.setLog.create({ data: set(oldest.id, { createdAt: ago(2990) }) });
    const prior = await prisma.workoutSession.create({ data: { userId, startedAt: ago(1500) } });
    await prisma.setLog.createMany({ data: [3, 2, 1, 0].map((index) => set(prior.id, { createdAt: ago(1490 - index), weightKg: 20 + index, reps: 8 + index })) });
    await prisma.setLog.create({ data: set(prior.id, { exerciseId: "lat-pulldown", createdAt: ago(1480), weightKg: 99 }) });
    const foreign = await prisma.workoutSession.create({ data: { userId: otherUser, startedAt: ago(60), endedAt: ago(30) } });
    await prisma.setLog.create({ data: set(foreign.id, { userId: otherUser, createdAt: ago(50), weightKg: 99 }) });
    // Reject a mismatched owner on either side of the session relation.
    await prisma.setLog.create({ data: set(foreign.id, { createdAt: ago(40), weightKg: 98 }) });
    await prisma.setLog.create({ data: set(prior.id, { userId: otherUser, createdAt: ago(35), weightKg: 97 }) });
    assert.equal(await getPreviousExerciseSession(otherUser, exerciseId, foreign.id), null);
    const current = await prisma.workoutSession.create({ data: { userId, startedAt: ago(5) } });
    const reference = await getPreviousExerciseSession(userId, exerciseId, current.id);
    assert.deepEqual(reference.date, prior.startedAt);
    assert.deepEqual(reference.sets.map(({ weightKg, reps }) => [weightKg, reps]), [[20, 8], [21, 9], [22, 10], [23, 11]]);
    assert.equal(await getPreviousExerciseSession(userId, "hack-squat", current.id), null);

    await actionContext.run({ userId, invalidations: [] }, async () => {
      success(await calibrateExercise({ exerciseId, weightKg: 20, stepKg: 2.5 }));
      success(await adjustExercise({ exerciseId, weightKg: 25, stepKg: 2.5 }));
      const input = { setId: randomUUID(), exerciseId, reps: 8, expectedLevel: 1, expectedWeightKg: 25, expectedStepKg: 2.5 };
      success(await logSet(input));
      assert.deepEqual(await getPreviousExerciseSession(userId, exerciseId, current.id), reference);
      success(await undoLastSet({ exerciseId, setId: input.setId }));
      assert.deepEqual(await getPreviousExerciseSession(userId, exerciseId, current.id), reference);
      success(await logSet({ ...input, setId: randomUUID() }));
      success(await finishWorkout());
      assert.equal(await getActiveSession(userId), null);
      const afterFinish = await getPreviousExerciseSession(userId, exerciseId, null);
      assert.deepEqual(afterFinish.date, current.startedAt);
      assert.deepEqual(afterFinish.sets.map(({ weightKg, reps }) => [weightKg, reps]), [[25, 8]]);
      const next = await prisma.workoutSession.create({ data: { userId } });
      assert.deepEqual(await getPreviousExerciseSession(userId, exerciseId, next.id), afterFinish);
    });
  } finally {
    await prisma.setLog.deleteMany({ where: { userId: { in: [userId, otherUser] } } });
    await prisma.workoutSession.deleteMany({ where: { userId: { in: [userId, otherUser] } } });
    await prisma.exerciseProgress.deleteMany({ where: { userId: { in: [userId, otherUser] } } });
    await prisma.$disconnect();
  }
});
