// Uses PostgreSQL; cleanup only touches unique test-user rows created here.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const environment = new URL(".env.local", root);
if (existsSync(environment)) process.loadEnvFile(fileURLToPath(environment));
assert.ok(process.env.DATABASE_URL, "Set DATABASE_URL or provide .env.local");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
    return nextResolve(specifier, context);
  },
});

const { prisma } = await import("../lib/prisma.ts");
const { getPlanningContext } = await import("../lib/queries.ts");
const now = new Date("2026-09-25T12:00:00.000Z");
const day = 86_400_000;
const ago = (ms) => new Date(now.getTime() - ms);
const userId = `spec14-test-${randomUUID()}`;
const emptyUser = `spec14-empty-${randomUUID()}`;
const otherUser = `spec14-other-${randomUUID()}`;

async function session(owner, startedAt, sets = []) {
  return prisma.workoutSession.create({
    data: {
      userId: owner, startedAt,
      sets: { create: sets.map((set) => ({
        userId: owner, exerciseId: "barbell-bench-press", level: 1,
        weightKg: 10, reps: 10, createdAt: startedAt, ...set,
      })) },
    },
  });
}

test("planning context uses bounded, scoped training history", async (t) => {
  try {
    await t.test("an empty account has no inferred history or calibration", async () => {
      assert.deepEqual(await getPlanningContext(emptyUser, now), {
        profile: null, lastTrained: {}, daysSinceGroup: {}, recentSessions: [], levels: {},
      });
    });
    await prisma.trainingProfile.create({data:{userId, ...{ goal: "build_muscle", experience: "experienced", daysPerWeek: 4, sessionMinutes: 60, equipment: ["barbell", "dumbbell", "machine", "cable"] }}});
    assert.deepEqual((await getPlanningContext(userId, now)).profile, { goal: "build_muscle", experience: "experienced", daysPerWeek: 4, sessionMinutes: 60, equipment: ["barbell", "dumbbell", "machine", "cable"] });
    assert.equal((await getPlanningContext(otherUser, now)).profile, null);
    await prisma.exerciseProgress.createMany({ data: [
      { userId, exerciseId: "barbell-bench-press", level: 4, weightKg: 10, stepKg: 2.5, startWeightKg: 10 },
      { userId, exerciseId: "seated-calf-raise", level: 2, weightKg: 10, stepKg: 2.5, startWeightKg: 10 },
      { userId: otherUser, exerciseId: "lat-pulldown", level: 99, weightKg: 10, stepKg: 2.5, startWeightKg: 10 },
    ] });
    await session(userId, ago(30 * day), [{ exerciseId: "leg-press" }]);
    await session(userId, ago(30 * day + 1), [{ exerciseId: "standing-calf-raise" }]);
    await session(userId, ago(8 * day), [{ exerciseId: "cable-pushdown" }]);
    await session(userId, ago(5 * day), [{ exerciseId: "lat-pulldown" }]);
    await session(userId, ago(2 * day), [
      { createdAt: ago(2 * day - 1000), reps: 8 },
      { createdAt: ago(2 * day - 2000), reps: 12 },
      { createdAt: ago(2 * day - 3000), exerciseId: "lat-pulldown", reps: 9 },
    ]);
    await session(userId, ago(day / 2), [{ exerciseId: "cable-crunch" }]);
    // Empty and future-only sessions must not displace recent training.
    await session(userId, ago(1000));
    await session(userId, now, [{ createdAt: new Date(now.getTime() + 1), exerciseId: "seated-calf-raise" }]);
    // Deliberately inconsistent nested ownership must not expose another user's session.
    await session(otherUser, now, [
      { exerciseId: "face-pull" },
      { userId, exerciseId: "dumbbell-shrug" },
    ]);

    await t.test("newest pattern/group dates ignore core for Auto and use whole days", async () => {
      const context = await getPlanningContext(userId, now);
      assert.deepEqual(context.lastTrained, {
        push: ago(2 * day - 2000), pull: ago(2 * day - 3000), legs: ago(30 * day),
      });
      assert.deepEqual(context.daysSinceGroup, { abs: 0, back: 1, chest: 1, triceps: 8, quads: 30 });
      assert.equal(context.lastTrained.core, undefined);
      assert.equal(context.daysSinceGroup.calves, undefined);
      assert.equal(context.daysSinceGroup.shoulders, undefined);
    });

    await t.test("last three sessions with sets aggregate per-exercise counts and best reps", async () => {
      const { recentSessions } = await getPlanningContext(userId, now);
      assert.deepEqual(recentSessions, [
        { daysAgo: 0, exercises: [{ id: "cable-crunch", sets: 1, bestReps: 10 }] },
        { daysAgo: 2, exercises: [
          { id: "lat-pulldown", sets: 1, bestReps: 9 },
          { id: "barbell-bench-press", sets: 2, bestReps: 12 },
        ] },
        { daysAgo: 5, exercises: [{ id: "lat-pulldown", sets: 1, bestReps: 10 }] },
      ]);
    });

    await t.test("progress is scoped and remains available without recent sets", async () => {
      assert.deepEqual((await getPlanningContext(userId, now)).levels, {
        "barbell-bench-press": 4, "seated-calf-raise": 2,
      });
      const other = await getPlanningContext(otherUser, now);
      assert.deepEqual(other.levels, { "lat-pulldown": 99 });
      assert.deepEqual(other.lastTrained, { pull: now });
      assert.deepEqual(other.daysSinceGroup, { shoulders: 0 });
      assert.deepEqual(other.recentSessions, [
        { daysAgo: 0, exercises: [{ id: "face-pull", sets: 1, bestReps: 10 }] },
      ]);
      assert.deepEqual((await getPlanningContext(emptyUser, now)).levels, {});
    });
  } finally {
    try {
      // Delete sets first because this fixture also tests inconsistent nested ownership.
      await prisma.setLog.deleteMany({ where: { userId: { in: [userId, emptyUser, otherUser] } } });
      await prisma.workoutSession.deleteMany({ where: { userId: { in: [userId, emptyUser, otherUser] } } });
      await prisma.exerciseProgress.deleteMany({ where: { userId: { in: [userId, emptyUser, otherUser] } } });
    } finally {
      await prisma.trainingProfile.deleteMany({where:{userId:{in:[userId,emptyUser,otherUser]}}});
      await prisma.$disconnect();
    }
  }
});
