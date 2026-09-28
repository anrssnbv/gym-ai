import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { getExercise } from "./catalog.ts";
import { candidateExercises, coverageRequirements, exerciseTiming, DURATIONS_MIN, planTargets, type Focus } from "./plan.ts";
import type { TrainingProfile } from "./training-profile.ts";
import { planOutputSchema } from "./plan-schema.ts";
import type { PlanningContext } from "./queries.ts";

export const MODEL = "gpt-5.4-mini";

export const INSTRUCTIONS = `Plan one gym session using the supplied training profile, candidates, targets, coverage requirements, and difficulty-based timing estimates.
Generated workouts support 60, 90, and 120 minutes. Requested durationMin overrides the profile preference. Shorter sessions use the separate exercise menu.
Plan from time first: estimated minutes = sum(sets * (setMinutes + restMinutes)). Count each working set once, even when it trains multiple muscles. Reserve one complete work-and-rest cycle per set, including the last set. Do not use LV or the exercise countdown for timing, change supplied times, or add exercise-change overhead. Warm-up and separate setup are outside the budget; any optional warm-up suggestion must say it is extra.
Stay within durationMin and all supplied targets. Aim near targetTotalSets when feasible, choosing suitable exercises or fewer sets within the bounds to fit. Never maximize every exercise's sets just to fill time. Planning time is an estimate, not an exact promised session length.
Full body: choose 8–10 distinct exercises, 1–2 sets each. At 60 minutes use 9–12 total sets, usually around 10. At 90/120 minutes aim around 15/20 total sets when time permits. Cover chest, upper back, shoulders, biceps, triceps, knee-dominant legs and hamstrings. Select at most two exercises with the same candidate group. Front, side and rear delts all count as ONE shoulders group: an overhead press plus lateral raise plus reverse pec deck is INVALID. Normally choose one shoulder exercise and use calves or abs for extra slots. A valid 60-minute example is squat 2 sets, bench press 2, lat pulldown 1, lateral raise 1, curl 1, pushdown 1, leg curl 1, calf raise 1: 8 exercises, 10 sets, 59 minutes with the supplied timings. Vary suitable exercises while preserving coverage and these count/time rules. No dedicated forearm candidates exist; never invent an ID.
Push/pull/legs: choose 4–5 exercises. At 60 minutes use 2–3 sets each with total time within budget; do not automatically use three sets for everything. At 90/120 minutes use exactly 3 sets each, totaling 12–15 sets. A 120-minute split can finish early; never prescribe four or five sets to fill it. At 90 minutes choose four exercises if five would exceed the budget.
Upper body: follow supplied targets, balancing pushing and pulling with shoulders and arms. For all focuses, each requiredCoverage entry must match at least one selected exercise's primary heads, or its secondary heads only when allowSecondary is true. Compound overlap does not multiply set counts. Avoid repeated similar presses while omitting other required areas. Include calf/core work for legs when slots and candidates permit.
Use only candidate IDs without duplicates; put compounds before isolation. Prefer calibrated candidates when they provide the required coverage, but include uncalibrated exercises as needed: the app handles calibration. Calibration never limits the exercise count. Equipment restrictions are already reflected in candidates.
Use trainingProfile.goal: build_muscle emphasizes balanced coverage; get_stronger prioritizes relevant compounds; general_fitness and weight_management emphasize balanced resistance training and consistency. Experience changes exercise choice and cue clarity within the same supplied targets; it does not shrink full body to three or four exercises. Use weekly schedule to choose emphasis without inferring attendance. For full body on 1–3 days per week, briefly explain balanced coverage across that schedule.
Prefer less recently trained areas while keeping required focus coverage. Missing history means no recorded training in the supplied history, not that a muscle has never been trained. Do not invent history.
Before returning, count distinct exercises and total sets, check every coverage requirement, and calculate the full work-and-rest total. Return only the supplied structured response: short title, 1–2 sentence summary explaining the emphasis, and one short form cue per exercise. Write English within the schema's character limits. Never give weights, repetitions, percentages, level changes, diets, medical advice, or weight-loss guarantees.`;

export async function generatePlan({ focus, durationMin, context }: {
  focus: Focus;
  durationMin: (typeof DURATIONS_MIN)[number];
  context: PlanningContext & { profile: TrainingProfile };
}) {
  const candidates = candidateExercises(focus, context.profile.equipment);
  const targets = planTargets(focus, durationMin);
  const schema = planOutputSchema(candidates.map((exercise) => exercise.id), targets.maxExercises, targets.maxSets, targets.minExercises, targets.minSets);
  const { goal, experience, daysPerWeek, sessionMinutes, equipment } = context.profile;
  const input = JSON.stringify({
    focus, durationMin, targets, requiredCoverage: coverageRequirements(focus, candidates),
    trainingProfile: { goal, experience, daysPerWeek, sessionMinutes, equipment },
    candidates: candidates.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      group: exercise.groupId,
      compound: exercise.compound,
      pattern: exercise.pattern,
      primary: exercise.primary,
      secondary: exercise.secondary,
      ...exerciseTiming(exercise),
      level: context.levels[exercise.id] ?? null,
    })),
    daysSinceGroup: context.daysSinceGroup,
    recentSessions: context.recentSessions,
  });
  const client = new OpenAI({ timeout: 30_000, maxRetries: 1 });
  const response = await client.responses.parse({
    model: MODEL,
    reasoning: { effort: "low" },
    instructions: INSTRUCTIONS,
    input,
    text: { format: zodTextFormat(schema, "workout_plan") },
  });
  if (response.output_parsed === null) throw new Error("AI returned no workout plan");
  const plan = schema.parse(response.output_parsed);
  plan.exercises.sort((a, b) => Number(getExercise(b.exerciseId)!.compound) - Number(getExercise(a.exerciseId)!.compound));
  return plan;
}
