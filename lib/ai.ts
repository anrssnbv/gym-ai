import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { roundSeconds } from "./game.ts";
import { candidateExercises, DURATIONS_MIN, maxExercises, type Focus } from "./plan.ts";
import { planOutputSchema } from "./plan-schema.ts";
import type { PlanningContext } from "./queries.ts";

export const MODEL = "gpt-5.4-mini";

export const INSTRUCTIONS = `You plan one gym session inside a gamified app.
Pick only exercises from candidates, between 3 and maxExercises, with no duplicates.
Put compound exercises before isolation and cover the main muscle groups of the focus.
Usually use 2–4 sets per exercise (1–5 allowed). Time is approximately the sum of sets × roundMinutes plus 1 minute per exercise change; it must fit durationMin.
Favour groups with the most days since training. Avoid groups trained in the last 2 days unless the focus needs them. Missing history means never trained; do not invent history.
Prefer calibrated exercises (level is not null). Count calibrated candidates only within this focus. With at least 2 calibrated candidates, allow at most 1 new exercise. With fewer than 2, allow at most 3 minus the calibrated candidate count new exercises, so a new user can receive a valid three-exercise plan.
The new-exercise cap is mandatory and takes precedence over recency and muscle-coverage preferences. Count every calibrated candidate, including core exercises for legs. With exactly 2 calibrated candidates, include both and at most 1 new exercise, even if a calibrated group was trained recently. Before returning, count selected exercises with level null and verify the cap.
The title names the session. The summary explains the training choice from the history in 1–2 short, complete sentences, without discussing internal selection rules. Each note is one short form cue. Write display text in English and keep it comfortably within the schema's character limits.
Never give weights, reps, percentages, or level changes: the app sets them.`;

export async function generatePlan({ focus, durationMin, context }: {
  focus: Focus;
  durationMin: (typeof DURATIONS_MIN)[number];
  context: PlanningContext;
}) {
  const candidates = candidateExercises(focus);
  const calibratedIds = candidates.filter((exercise) => context.levels[exercise.id] != null).map((exercise) => exercise.id);
  const newLimit = calibratedIds.length >= 2 ? 1 : 3 - calibratedIds.length;
  const max = maxExercises(durationMin);
  const schema = planOutputSchema(candidates.map((exercise) => exercise.id), max);
  const input = JSON.stringify({
    focus, durationMin, maxExercises: max,
    candidates: candidates.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      group: exercise.groupId,
      compound: exercise.compound,
      roundMinutes: roundSeconds(exercise.compound) / 60,
      level: context.levels[exercise.id] ?? null,
    })),
    daysSinceGroup: context.daysSinceGroup,
    recentSessions: context.recentSessions,
  });
  const client = new OpenAI({ timeout: 30_000, maxRetries: 1 });
  const response = await client.responses.parse({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions: `${INSTRUCTIONS}\nFor this request, the calibrated candidate IDs are ${JSON.stringify(calibratedIds)}. You may select at most ${newLimit} exercises outside that list. This is a hard constraint; include at least ${3 - newLimit} IDs from that list to reach the minimum of 3 exercises.`,
    input,
    text: { format: zodTextFormat(schema, "workout_plan") },
  });
  if (response.output_parsed === null) throw new Error("AI returned no workout plan");
  return schema.parse(response.output_parsed);
}
