import assert from "node:assert/strict";
import test from "node:test";
import { generatePlan, MODEL } from "./ai.ts";
import type { TrainingProfile } from "./training-profile.ts";
import { candidateExercises } from "./plan.ts";

const profile: TrainingProfile = { goal: "build_muscle", experience: "experienced", daysPerWeek: 4, sessionMinutes: 60, equipment: ["barbell", "dumbbell", "machine", "cable"] };

test("AI request sends focus candidates and shared targets and timing without account data", async (t) => {
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-no-network";
  const candidates = candidateExercises("legs");
  const output = {
    title: "Legs", summary: "A balanced session.",
    exercises: candidates.slice(0, 4).map(({ id }) => ({ exerciseId: id, sets: 3, note: "Move with control." })),
  };
  let request: Record<string, unknown> = {};
  let responseOutput: unknown[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    request = JSON.parse(String(options.body));
    return new Response(JSON.stringify({ id: "resp_test", object: "response", status: "completed", output: responseOutput }), {
      headers: { "Content-Type": "application/json" },
    });
  });
  const message = (value: unknown) => [{
    id: "msg_test", type: "message", role: "assistant", status: "completed",
    content: [{ type: "output_text", text: JSON.stringify(value), annotations: [] }],
  }];
  try {
    for (const count of [0, 1, 2]) {
      // Calibration affects candidate metadata, never the count/volume targets.
      const calibratedIds = ["barbell-back-squat", "cable-crunch"].slice(0, count);
      const levels = Object.fromEntries([...calibratedIds.map((id) => [id, 1]), ["barbell-bench-press", 2]]);
      responseOutput = message(output);
      assert.deepEqual(await generatePlan({ focus: "legs", durationMin: 60, context: {
        profile, lastTrained: {}, daysSinceGroup: { quads: 0 }, recentSessions: [], levels,
      } }), output);
      assert.equal(request.model, MODEL);
      assert.deepEqual(request.reasoning, { effort: "low" });
      const input = JSON.parse(String(request.input));
      assert.deepEqual(Object.keys(input).sort(), ["candidates", "daysSinceGroup", "durationMin", "focus", "recentSessions", "requiredCoverage", "targets", "trainingProfile"]);
      assert.deepEqual(input.trainingProfile, profile);
      assert.equal(input.targets.maxExercises, 5);
      assert.equal(input.targets.maxSets, 3);
      assert.match(String(request.instructions), /build_muscle/);
      assert.match(String(request.instructions), /Calibration never limits/);
      assert.ok(input.requiredCoverage.some((r: { name: string }) => r.name === "hamstrings"));
      assert.ok(input.candidates.every((e: { setMinutes: number; restMinutes: number }) => e.setMinutes >= 2 && e.restMinutes >= 3));
      assert.ok(input.candidates.every((e: Record<string, unknown>) => !('roundMinutes' in e) && 'primary' in e && 'secondary' in e));
      assert.deepEqual(input.candidates.map((row: { id: string }) => row.id), candidates.map(({ id }) => id));
      assert.equal(input.candidates.find((row: { id: string }) => row.id === "cable-crunch").level, count === 2 ? 1 : null);
    }
    responseOutput = message({ ...output, exercises: [...output.exercises].reverse() });
    const ordered = await generatePlan({ focus: "legs", durationMin: 60, context: {
      profile, lastTrained: {}, daysSinceGroup: {}, recentSessions: [], levels: {},
    } });
    assert.equal(ordered.exercises.at(-1)!.exerciseId, "leg-extension");
    assert.deepEqual(new Set(ordered.exercises.map(e => e.exerciseId)), new Set(output.exercises.map(e => e.exerciseId)));
    responseOutput = [];
    await assert.rejects(() => generatePlan({ focus: "legs", durationMin: 60, context: {
      profile, lastTrained: {}, daysSinceGroup: {}, recentSessions: [], levels: {},
    } }), /AI returned no workout plan/);
    responseOutput = message({ ...output, exercises: [{ ...output.exercises[0], sets: 6 }, ...output.exercises.slice(1)] });
    await assert.rejects(() => generatePlan({ focus: "legs", durationMin: 60, context: {
      profile, lastTrained: {}, daysSinceGroup: {}, recentSessions: [], levels: {},
    } }));
    const dumbbells = candidateExercises("full_body", ["dumbbell"]);
    const beginner = { ...profile, experience: "new" as const, daysPerWeek: 3, sessionMinutes: 90 as const, equipment: ["dumbbell" as const] };
    const personalized = { ...output, exercises: dumbbells.slice(0, 8).map(e => ({ exerciseId: e.id, sets: 1, note: "Control." })) };
    responseOutput = message(personalized);
    await generatePlan({ focus: "full_body", durationMin: 60, context: { profile: beginner, lastTrained: {}, daysSinceGroup: {}, recentSessions: [], levels: { "barbell-bench-press": 3, "lat-pulldown": 2 } } });
    const payload = JSON.parse(String(request.input));
    assert.deepEqual(payload.trainingProfile, beginner);
    assert.equal(payload.durationMin, 60);
    assert.equal(payload.targets.maxExercises, 10);
    assert.equal(payload.targets.maxSets, 2);
    assert.deepEqual(payload.candidates.map((e: { id: string }) => e.id), dumbbells.map(e => e.id));
    assert.ok(payload.candidates.every((e: { level: number | null }) => e.level === null));
    const format = (request.text as { format: { schema: { properties: { exercises: { maxItems: number; items: { properties: { sets: { maximum: number }; exerciseId: { enum: string[] } } } } } } } }).format;
    assert.equal(format.schema.properties.exercises.maxItems, 10);
    assert.equal(format.schema.properties.exercises.items.properties.sets.maximum, 2);
    assert.deepEqual(format.schema.properties.exercises.items.properties.exerciseId.enum, dumbbells.map(e => e.id));
    responseOutput = message({ ...personalized, exercises: personalized.exercises.map(e => ({ ...e, sets: 4 })) });
    await assert.rejects(() => generatePlan({ focus: "full_body", durationMin: 60, context: { profile: beginner, lastTrained: {}, daysSinceGroup: {}, recentSessions: [], levels: {} } }));
  } finally {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  }
});
