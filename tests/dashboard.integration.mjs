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
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, root).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { prisma } = await import("../lib/prisma.ts");
const { getDashboard } = await import("../lib/queries.ts");
const now = new Date("2026-09-25T12:00:00.000Z");
const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;
const ago = (ms) => new Date(now.getTime() - ms);
const since = ago(7 * day);
const userId = `spec12-test-${randomUUID()}`;
const emptyUser = `spec12-empty-${randomUUID()}`;
const otherUser = `spec12-quote-${randomUUID()}' OR '1'='1`;
const users = [userId, emptyUser, otherUser];

async function session(owner, startedAt, endedAt, sets = []) {
  return prisma.workoutSession.create({
    data: {
      userId: owner, startedAt, endedAt,
      sets: { create: sets.map((set) => ({
        userId: owner, exerciseId: "barbell-bench-press", level: 1,
        weightKg: 10, reps: 10, ...set,
      })) },
    },
  });
}

test("dashboard aggregates against PostgreSQL", async (t) => {
  try {
    await t.test("a new account returns zeros and empty collections", async () => {
      assert.deepEqual(await getDashboard(emptyUser, now), {
        power: 0, unlocked: 0, workouts: { total: 0, last7Days: 0 },
        timeTrainedMs: 0, volumeKg: 0, heat: {}, recent: [],
      });
    });

    await prisma.exerciseProgress.createMany({ data: [
      { userId, exerciseId: "barbell-bench-press", level: 1, weightKg: 10, stepKg: 2.5, startWeightKg: 10 },
      { userId, exerciseId: "incline-bench-press", level: 5, weightKg: 20, stepKg: 2.5, startWeightKg: 10 },
      { userId: otherUser, exerciseId: "barbell-bench-press", level: 100, weightKg: 100, stepKg: 2.5, startWeightKg: 10 },
    ] });
    const active = await session(userId, ago(4 * hour), null, [{ createdAt: ago(3 * hour), weightKg: 20, reps: 5 }]);
    const stale = await session(userId, ago(5 * hour), null, [{ createdAt: ago(3 * hour + 1), leveledUp: true }]);
    const ended = await session(userId, ago(2 * hour), ago(hour), [
      { createdAt: ago(90 * minute), reps: 5, leveledUp: true },
      { createdAt: ago(70 * minute), reps: 5, leveledUp: true },
    ]);
    await session(userId, since, new Date(since.getTime() + 30 * minute), [
      { createdAt: since, exerciseId: "wide-chest-press", weightKg: 12.5, reps: 8 },
    ]);
    await session(userId, new Date(since.getTime() - 1), new Date(since.getTime() + 10 * minute), [
      { createdAt: new Date(since.getTime() - 1), exerciseId: "incline-bench-press" },
    ]);
    const daily = [];
    for (let days = 1; days <= 4; days++) {
      daily.push(await session(userId, ago(days * day), ago(days * day - 20 * minute), [
        { createdAt: ago(days * day - 10 * minute) },
      ]));
    }
    // Empty ended, active, and stale sessions must all stay out of statistics.
    await session(userId, ago(hour), now);
    await session(userId, ago(hour), null);
    await session(userId, ago(5 * hour), null);
    const other = await session(otherUser, ago(hour), now, [
      { createdAt: ago(30 * minute), weightKg: 99.125, reps: 3, exerciseId: "lat-pulldown", leveledUp: true },
    ]);

    await t.test("totals, duration, volume, and heat respect session and seven-day boundaries", async () => {
      const dashboard = await getDashboard(userId, now);
      assert.equal(dashboard.power, 4);
      assert.equal(dashboard.unlocked, 2);
      assert.deepEqual(dashboard.workouts, { total: 9, last7Days: 8 });
      assert.equal(dashboard.timeTrainedMs, 5 * hour);
      assert.equal(dashboard.volumeKg, 900);
      assert.deepEqual(dashboard.heat, { "chest-middle": 9, "chest-lower": 1 });
      // Secondary heads and the set one millisecond outside the window contribute nothing.
      assert.equal(dashboard.heat["chest-upper"], undefined);
      assert.equal(dashboard.heat["delts-front"], undefined);
    });

    await t.test("recent returns five finished sessions, resolves stale end, and counts level-ups", async () => {
      const { recent } = await getDashboard(userId, now);
      assert.deepEqual(recent.map((row) => row.id), [ended.id, stale.id, ...daily.slice(0, 3).map((row) => row.id)]);
      assert.deepEqual(recent[0], { id: ended.id, startedAt: ago(2 * hour), endedAt: ago(hour), setCount: 2, levelUps: 2 });
      assert.deepEqual(recent[1], { id: stale.id, startedAt: ago(5 * hour), endedAt: ago(3 * hour + 1), setCount: 1, levelUps: 1 });
      assert.equal(recent.some((row) => row.id === active.id), false);
      assert.ok(recent.slice(2).every((row) => row.levelUps === 0));
      assert.equal((await prisma.workoutSession.findFirst({ where: { id: stale.id, userId } })).endedAt, null);
    });

    await t.test("all aggregates are isolated and raw volume SQL treats quotes as user ID data", async () => {
      const dashboard = await getDashboard(otherUser, now);
      assert.equal(dashboard.power, 99);
      assert.equal(dashboard.unlocked, 1);
      assert.deepEqual(dashboard.workouts, { total: 1, last7Days: 1 });
      assert.equal(dashboard.timeTrainedMs, hour);
      assert.equal(dashboard.volumeKg, 297.38);
      assert.deepEqual(dashboard.heat, { "back-lats": 1 });
      assert.deepEqual(dashboard.recent.map((row) => row.id), [other.id]);
      assert.equal((await getDashboard(emptyUser, now)).volumeKg, 0);
    });
  } finally {
    try {
      for (const owner of users) {
        await prisma.setLog.deleteMany({ where: { userId: owner } });
        await prisma.workoutSession.deleteMany({ where: { userId: owner } });
        await prisma.exerciseProgress.deleteMany({ where: { userId: owner } });
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
