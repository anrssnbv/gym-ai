Add the AI coach backend: a migration for the session plan and generation limit; pure planning helpers with tests; the OpenAI call with Structured Outputs; and the `generateWorkout` Server Action. Backend only; spec 15 wires the Generate sheet from spec 13.

## Dependencies

- Install: `npm i openai` (v7; its Zod helpers support Zod 4)
- Env: `OPENAI_API_KEY` in `.env.local`, the name in `.env.example`, and the value in Vercel
- Before real use, set a monthly budget on the OpenAI project (Open Question 5)

## Migration

Add to `prisma/schema.prisma`:

```prisma
model WorkoutSession {
  // existing fields stay as they are
  plan  Json?  // WorkoutPlan; parse with workoutPlanSchema when reading
}

model PlanGeneration {
  id        String   @id @default(cuid())
  userId    String
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
```

Store the resolved focus only in `WorkoutPlan.focus` inside `plan`; no duplicate `focus` column or Prisma `Focus` enum. Run `npx prisma migrate dev --name ai-plans`, then `npx prisma generate`.

## Planning Helpers

Extend `lib/plan.ts`. It stays free of Zod because the Generate sheet imports it on the client. The only runtime import is `./catalog.ts` (relative, with the extension, so Node can test it).

- `DAILY_PLAN_LIMIT = 10`
- `FOCUS_PATTERNS: Record<Focus, Pattern[]>` — push → push; pull → pull; legs → legs, core; upper → push, pull; full_body → all four
- `candidateExercises(focus): Exercise[]` — catalog exercises whose `pattern` is in `FOCUS_PATTERNS[focus]`
- `resolveAutoFocus(lastTrained: Partial<Record<'push' | 'pull' | 'legs', Date>>)` → the pattern trained longest ago; never trained counts as oldest; ties go push → pull → legs
- `maxExercises(durationMin)` → 30: 4, 45: 5, 60: 6, 90: 8 (the minimum is always 3)
- `dedupeExercises(plan)` — keeps the first occurrence of each `exerciseId`
- `estimatePlanMinutes(plan)` — sum `sets × roundSeconds(compound) / 60` across catalog exercises, plus one minute per exercise change. Enforce this estimate after deduplication against the requested duration.

## Plan Schemas

Create `lib/plan-schema.ts`, used only on the server (actions, queries, `lib/ai.ts`). Imports: `zod`, `./plan.ts`, `./catalog.ts`.

- `planOutputSchema(ids: readonly ExerciseId[], max: number)` — the Zod schema the model must fill, with required fields only (strict Structured Outputs doesn't allow optional ones):
  - `title`: string, 1–60 chars
  - `summary`: string, 1–240 chars
  - `exercises`: 3–`max` items of `{ exerciseId: z.enum(ids), sets: integer 1–5, note: string 1–120 chars }`
- `workoutPlanSchema` — `planOutputSchema(all catalog IDs, 8)` extended with `focus: z.enum(FOCUSES)`, declared with `satisfies z.ZodType<WorkoutPlan>` so TypeScript fails if it drifts from spec 13's `WorkoutPlan` interface. Used for `WorkoutSession.plan` and for `startWorkout` in spec 15.

Keep the stated string/array limits. The [official Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas) restricts these keywords for fine-tuned models; it does not establish a blanket rejection for the standard models used here. Verify the actual selected model with the smoke test before changing API schema constraints; always retain local Zod limits.

Create `lib/plan.test.ts` (it can import both `./plan.ts` and `./plan-schema.ts`):

- candidates: legs includes Cable Crunch; upper includes Face Pull and excludes Leg Press; push excludes Lat Pulldown
- `resolveAutoFocus`: nothing trained → push; only push trained → pull; all three trained with legs oldest → legs
- `maxExercises` for each duration
- `workoutPlanSchema` accepts a valid plan and rejects an unknown `exerciseId`, `sets: 6` and two exercises
- `dedupeExercises` keeps the first of two identical IDs

## Planning Context

Add `getPlanningContext(userId, now = new Date())` to `lib/queries.ts`. It reads the user's sets from the last 30 days and their progress rows:

```ts
{
  lastTrained: Partial<Record<'push' | 'pull' | 'legs', Date>>; // newest set per pattern (core is ignored)
  daysSinceGroup: Partial<Record<MuscleGroupId, number>>;       // whole days since the newest set per exercise group
  recentSessions: { daysAgo: number; exercises: { id: string; sets: number; bestReps: number }[] }[]; // last 3 sessions with sets
  levels: Record<string, number>;                               // calibrated exerciseId → level
}
```

## AI Call

Create `lib/ai.ts`. It imports only packages and relative `.ts` files (no `@/`), so it also runs under plain Node.

- `MODEL = 'gpt-5.4-mini'`, the newest small model in the openai 7.23 model list. If the account can't use it, fall back to `'gpt-5-mini'`.
- `INSTRUCTIONS`, the coach rules sent as `instructions`:
  - you plan one gym session inside a gamified app; pick only exercises from `candidates`, 3 to `maxExercises`, with no duplicates
  - compound before isolation; cover the main muscle groups of the focus
  - usually 2–4 sets per exercise (1–5 allowed). Time is about `sets × roundMinutes` + 1 min per exercise change, and must fit `durationMin`.
  - favour groups with the most days since training; avoid groups trained in the last 2 days unless the focus needs them
  - prefer calibrated exercises (`level` not null). With at least 2 calibrated candidates for the selected focus, allow at most 1 new exercise. With fewer than 2, allow enough new exercises to reach the minimum of 3 (at most `3 - calibratedCandidateCount` new exercises). Count only focus-eligible candidates; new users must be able to receive a valid plan
  - `title` names the session; `summary` explains the choice from the history in 1–2 sentences; each `note` is one short form cue
  - never give weights, reps or percentages: the app sets them
- `generatePlan({ focus, durationMin, context })`:
  - payload (JSON string as `input`): `focus`, `durationMin`, `maxExercises`, `candidates` (`{ id, name, group, compound, roundMinutes, level }`, where `level` is `null` when uncalibrated), `daysSinceGroup`, `recentSessions`. No names or emails.
  - create the client inside the function (`new OpenAI({ timeout: 30_000, maxRetries: 1 })`), so a missing key fails the request, not the build
  - `client.responses.parse({ model: MODEL, reasoning: { effort: 'low' }, instructions: INSTRUCTIONS, input, text: { format: zodTextFormat(planOutputSchema(ids, max), 'workout_plan') } })`, with `zodTextFormat` from `openai/helpers/zod`. Drop `reasoning` only if the model rejects it.
  - `response.output_parsed` is `null` → throw
  - validate the parsed output locally with `planOutputSchema(ids, max)` too, then return it (without `focus`)

## Server Action

Add `generateWorkout({ durationMin, focus })` to `actions/workout.ts` (same action rules as spec 09):

1. `requireUserId()`; Zod: `durationMin` in `DURATIONS_MIN`, `focus` in `FOCUS_CHOICES`
2. count the user's `PlanGeneration` rows from the last 24 h; at `DAILY_PLAN_LIMIT` or more → `{ ok: false, error: 'Daily limit reached (10 plans). Try again tomorrow.' }`
3. no `OPENAI_API_KEY` → `{ ok: false, error: 'AI coach is not configured.' }`
4. `getPlanningContext`; focus = `resolveAutoFocus(context.lastTrained)` for Auto, otherwise the chosen one
5. insert a `PlanGeneration` row (it counts every attempt that reaches OpenAI, which is what costs money)
6. `generatePlan`; on any error, `console.error` it and return `{ ok: false, error: "Couldn't generate a workout. Try again." }`
7. `dedupeExercises({ focus, ...output })`; fewer than 3 exercises left → the same error. Validate focus membership and the calibrated/new-exercise limit against the actual candidate list before returning. Reject `estimatePlanMinutes(plan) > durationMin`; an exact fit is allowed. Invalid output returns the same retryable error, keeps its reserved attempt, and creates no workout. Do not silently trim sets or add automatic paid retries.
8. return `{ ok: true, data: plan }`. The plan is only a preview: nothing is written to `WorkoutSession` and there's nothing to revalidate.

## Scope Limits

- no UI changes and no `startWorkout` (spec 15)
- no streaming, chat or background jobs
- the AI's output never contains weights, reps or level changes

## Check When Done

- `npm test` passes, including `lib/plan.test.ts`
- `npx prisma migrate status` is up to date with `ai-plans`
- a one-off Node smoke test (not committed) of `generatePlan` with focus `pull`, 60 min and an empty context returns 3–6 pull exercises that pass `workoutPlanSchema`, in under ~15 s
- planning validation covers 0, 1, and 2 calibrated focus-eligible candidates, with a valid three-exercise plan in each case
- `npm run build` passes without `OPENAI_API_KEY` set
- `.env.example` lists `OPENAI_API_KEY`
- `generateWorkout` itself is checked through the UI in spec 15, including the daily limit
- `npm run lint` passes
- `progress-tracker.md` updated
