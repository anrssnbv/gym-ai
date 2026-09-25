import assert from "node:assert/strict";
import test from "node:test";
import { generatePlan, MODEL } from "./ai.ts";
import type { TrainingProfile } from "./training-profile.ts";
import { candidateExercises } from "./plan.ts";

const profile: TrainingProfile = { goal: "build_muscle", experience: "experienced", daysPerWeek: 4, sessionMinutes: 60, equipment: ["barbell", "dumbbell", "machine", "cable"] };

test("AI request sends focus candidates and explicit calibrated caps without account data", async (t) => {
  const key = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-no-network";
  const candidates = candidateExercises("legs");
  const output = {
    title: "Legs", summary: "A balanced session.",
    exercises: candidates.slice(0, 3).map(({ id }) => ({ exerciseId: id, sets: 3, note: "Move with control." })),
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
      // Cable Crunch is eligible for legs; a calibrated push exercise must not affect its cap.
      const calibratedIds = ["barbell-back-squat", "cable-crunch"].slice(0, count);
      const levels = Object.fromEntries([...calibratedIds.map((id) => [id, 1]), ["barbell-bench-press", 2]]);
      responseOutput = message(output);
      assert.deepEqual(await generatePlan({ focus: "legs", durationMin: 60, context: {
        profile, lastTrained: {}, daysSinceGroup: { quads: 0 }, recentSessions: [], levels,
      } }), output);
      assert.equal(request.model, MODEL);
      assert.deepEqual(request.reasoning, { effort: "low" });
      assert.ok(String(request.instructions).includes(`calibrated candidate IDs are ${JSON.stringify(calibratedIds)}`));
      assert.ok(String(request.instructions).includes(`at most ${count >= 2 ? 1 : 3 - count} exercises outside that list`));
      const input = JSON.parse(String(request.input));
      assert.deepEqual(Object.keys(input).sort(), ["candidates", "daysSinceGroup", "durationMin", "focus", "maxExercises", "maxSets", "recentSessions", "trainingProfile"]);
      assert.equal(input.maxExercises, 6);
      assert.deepEqual(input.trainingProfile, profile);
      assert.equal(input.maxSets, 5);
      assert.match(String(request.instructions), /build_muscle/);
      assert.match(String(request.instructions), /Experience changes cue clarity/);
      assert.deepEqual(input.candidates.map((row: { id: string }) => row.id), candidates.map(({ id }) => id));
      assert.equal(input.candidates.find((row: { id: string }) => row.id === "cable-crunch").level, count === 2 ? 1 : null);
    }
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
    const personalized = { ...output, exercises: dumbbells.slice(0, 3).map(e => ({ exerciseId: e.id, sets: 3, note: "Control." })) };
    responseOutput = message(personalized);
    await generatePlan({ focus: "full_body", durationMin: 30, context: { profile: beginner, lastTrained: {}, daysSinceGroup: {}, recentSessions: [], levels: { "barbell-bench-press": 3, "lat-pulldown": 2 } } });
    const payload = JSON.parse(String(request.input));
    assert.deepEqual(payload.trainingProfile, beginner);
    assert.equal(payload.durationMin, 30);
    assert.equal(payload.maxExercises, 4);
    assert.equal(payload.maxSets, 3);
    assert.deepEqual(payload.candidates.map((e: { id: string }) => e.id), dumbbells.map(e => e.id));
    assert.match(String(request.instructions), /calibrated candidate IDs are \[\]/);
    assert.match(String(request.instructions), /at most 3 exercises outside/);
    const format = (request.text as { format: { schema: { properties: { exercises: { maxItems: number; items: { properties: { sets: { maximum: number }; exerciseId: { enum: string[] } } } } } } } }).format;
    assert.equal(format.schema.properties.exercises.maxItems, 4);
    assert.equal(format.schema.properties.exercises.items.properties.sets.maximum, 3);
    assert.deepEqual(format.schema.properties.exercises.items.properties.exerciseId.enum, dumbbells.map(e => e.id));
    responseOutput = message({ ...personalized, exercises: personalized.exercises.map(e => ({ ...e, sets: 4 })) });
    await assert.rejects(() => generatePlan({ focus: "full_body", durationMin: 30, context: { profile: beginner, lastTrained: {}, daysSinceGroup: {}, recentSessions: [], levels: {} } }));
  } finally {
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  }
});
