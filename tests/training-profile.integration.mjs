// Real PostgreSQL and actions; only Clerk identity and Next cache invalidation are supplied by the test context.
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
const { saveTrainingProfile } = await import("../actions/training-profile.ts");
const { getTrainingProfile } = await import("../lib/queries.ts");
const { prisma } = await import("../lib/prisma.ts");
const profile = { goal: "build_muscle", experience: "new", daysPerWeek: 3, sessionMinutes: 60, equipment: ["barbell", "dumbbell"] };
const edited = { goal: "general_fitness", experience: "regular", daysPerWeek: 7, sessionMinutes: 45, equipment: ["cable"] };
const users = [];
function asUser(run) {
  const state = { userId: `spec16-test-${randomUUID()}`, invalidations: [] };
  users.push(state.userId);
  return actionContext.run(state, () => run(state));
}
function success(result) { assert.equal(result.ok, true, result.error); return result.data; }
async function trainingRows(userId) {
  return Promise.all([
    prisma.workoutSession.findMany({ where: { userId } }),
    prisma.exerciseProgress.findMany({ where: { userId } }),
    prisma.setLog.findMany({ where: { userId } }),
    prisma.planGeneration.findMany({ where: { userId } }),
  ]);
}

test("training profile actions and reads against PostgreSQL", async (t) => {
  try {
    await t.test("authentication precedes input validation", () => assert.rejects(() => saveTrainingProfile(null), /Integration action needs a test user/));
    await t.test("missing and malformed profiles return null", () => asUser(async ({ userId }) => {
      assert.equal(await getTrainingProfile(userId), null);
      await prisma.trainingProfile.create({ data: { userId, ...profile, goal: "invalid" } });
      assert.equal(await getTrainingProfile(userId), null);
      success(await saveTrainingProfile(profile));
      assert.deepEqual(await getTrainingProfile(userId), profile);
    }));
    await t.test("profile read failures propagate instead of presenting onboarding as missing data", (t) => asUser(async ({ userId }) => {
      const failure = new Error("Simulated profile database read failure");
      // Prisma's proxy has no method value descriptor, so expose a plain delegate for node:test.
      const original = prisma.trainingProfile;
      prisma.trainingProfile = { ...original, findUnique: original.findUnique };
      try {
        t.mock.method(prisma.trainingProfile, "findUnique", async () => { throw failure; });
        await assert.rejects(() => getTrainingProfile(userId), (error) => error === failure);
      } finally {
        t.mock.restoreAll();
        prisma.trainingProfile = original;
      }
    }));
    await t.test("invalid input and browser-supplied identity cannot write or revalidate", () => asUser(async ({ userId, invalidations }) => {
      for (const input of [null, {}, { ...profile, userId: "another-user" }, { ...profile, equipment: [] }, { ...profile, daysPerWeek: "3" }]) {
        assert.deepEqual(await saveTrainingProfile(input), { ok: false, error: "Check your training preferences and try again." });
      }
      assert.equal(await prisma.trainingProfile.count({ where: { userId } }), 0);
      assert.deepEqual(invalidations, []);
    }));
    await t.test("first save, edit, duplicate submit, and lost-response retry preserve one complete profile", () => asUser(async ({ userId, invalidations }) => {
      assert.deepEqual(success(await saveTrainingProfile({ ...profile, equipment: ["dumbbell", "barbell"] })), profile);
      const first = await prisma.trainingProfile.findUnique({ where: { userId } });
      assert.deepEqual(success(await saveTrainingProfile(edited)), edited);
      // Ignore one successful response to model a response lost after commit.
      await saveTrainingProfile(edited);
      assert.deepEqual(success(await saveTrainingProfile(edited)), edited);
      assert.equal(await prisma.trainingProfile.count({ where: { userId } }), 1);
      assert.deepEqual(await getTrainingProfile(userId), edited);
      assert.deepEqual((await prisma.trainingProfile.findUnique({ where: { userId } })).createdAt, first.createdAt);
      assert.deepEqual(invalidations, Array.from({ length: 4 }, () => ["/", "layout"]));
    }));
    await t.test("concurrent first saves leave exactly one whole submission", () => asUser(async ({ userId }) => {
      const results = await Promise.all([saveTrainingProfile(profile), saveTrainingProfile(edited), saveTrainingProfile(profile)]);
      results.forEach(success);
      assert.equal(await prisma.trainingProfile.count({ where: { userId } }), 1);
      const saved = await getTrainingProfile(userId);
      assert.ok(JSON.stringify(saved) === JSON.stringify(profile) || JSON.stringify(saved) === JSON.stringify(edited));
    }));
    await t.test("a save cannot overwrite another user's profile or any training records", () => asUser(async ({ userId }) => {
      success(await saveTrainingProfile(profile));
      const session = await prisma.workoutSession.create({ data: { userId } });
      await prisma.exerciseProgress.create({ data: { userId, exerciseId: "barbell-bench-press", weightKg: 20, stepKg: 2.5, startWeightKg: 20 } });
      await prisma.setLog.create({ data: { userId, sessionId: session.id, exerciseId: "barbell-bench-press", level: 1, weightKg: 20, reps: 8 } });
      await prisma.planGeneration.create({ data: { userId } });
      const before = await trainingRows(userId);
      await asUser(async ({ userId: otherId }) => {
        assert.equal(await getTrainingProfile(otherId), null);
        success(await saveTrainingProfile(edited));
        assert.deepEqual(await getTrainingProfile(otherId), edited);
        assert.deepEqual(await getTrainingProfile(userId), profile);
      });
      success(await saveTrainingProfile(edited));
      assert.deepEqual(await trainingRows(userId), before);
    }));
  } finally {
    await prisma.setLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.workoutSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.exerciseProgress.deleteMany({ where: { userId: { in: users } } });
    await prisma.planGeneration.deleteMany({ where: { userId: { in: users } } });
    await prisma.trainingProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.$disconnect();
  }
});
