Connect the AI coach end to end. The Generate sheet calls `generateWorkout`, the preview shows the real plan, Start workout saves it to a session, and the Workout tab plays the plan exercise by exercise. Builds on specs 11, 13 and 14.

## Start Action

Add `startWorkout({ plan })` to `actions/workout.ts` (same action rules as spec 09):

- parse `plan` with `workoutPlanSchema`; anything outside the catalog → `Invalid input`
- one serializable transaction with the bounded conflict retries from spec 09, using `findOpenSession(tx, userId, now)` for the shared lookup:
  - an active session exists (not stale) → set its `plan` (resolved focus is already inside the validated JSON), so the plan attaches to the workout already running
  - a stale open session exists → close it at its last activity (`sessionEnd`), then create a new one
  - otherwise → create a session with `plan` (`startedAt` = now)
- `revalidatePath('/', 'layout')`; return `{ sessionId }`

A new session has no sets yet. The banner shows it at once (last activity = `startedAt`), and the stats ignore it until its first set.

## Queries

Extend `lib/queries.ts`:

- `getSessionDetail` also returns `plan: WorkoutPlan | null` (`workoutPlanSchema.safeParse`; invalid → `null`)
- `getActivePlanStep(userId, exerciseId)` → `{ done, sets } | null`: when the active session's plan contains the exercise, `sets` is the planned count and `done` the sets logged for it in that session

## Generate Sheet

`components/workout/generate-sheet.tsx`:

- new props: `progress: Record<string, { level: number; weightKg: number }>` (the plain object from `getProgressMap`) and `hasActiveWorkout: boolean`. Home and the Workout empty state pass them.
- `Generate` calls `callAction(() => generateWorkout({ durationMin, focus }))` in a transition:
  - pending: the button shows `Planning…` with a pulsing `Sparkles` (`motion-safe:animate-pulse`), and the inputs are disabled
  - error: the message in `text-danger` above the button; Generate retries
  - success: `PlanPreview` of the returned plan
- thrown request failures use `callAction` and render inline errors; clear pending in `finally`, retain inputs/preview, and allow retry. Apply this to Generate, Regenerate, and Start.
- delete `SAMPLE_PLAN` and the sample note
- `PlanPreview` gains an optional `progress` prop with the exact same shape as `GenerateSheet.progress`: each exercise row shows `LV {level} · {formatKg(weight)}`, or `New — you'll calibrate it` when uncalibrated
- buttons under the preview:
  - primary `Start workout`, or `Add to current workout` when `hasActiveWorkout`: calls `callAction(() => startWorkout({ plan }))`, then `router.push('/workout')`, with a pending state and errors shown inline
  - secondary `Regenerate` (same inputs; counts toward the daily limit)
  - link-style `Change inputs`

## Workout Page With A Plan

`app/(app)/workout/page.tsx`, when the active session has a plan:

- header: the plan title, a focus Badge (`bg-ai-dim text-ai`), and the summary in muted text; `Started` and `ElapsedTime` stay
- a checklist in plan order, where each row links to the exercise page:
  - name, `{done} / {sets} sets`, and the note in small `text-ai`
  - a `Check` icon in `text-brand` when done ≥ sets
  - the first unfinished row is highlighted (`border-brand`)
- sets for exercises outside the plan are listed under `Extra` (the `SessionSets` grouping)
- the totals line and `Finish workout` stay at the bottom
- without a plan the page is unchanged (spec 11)

## Exercise Page In A Planned Workout

`app/(app)/exercises/[groupId]/[exerciseId]/page.tsx`:

- with `getActivePlanStep` not null, show a line above the level card: `Workout · set {done + 1} of {sets}`, or `Workout · done` with a `Check` once done ≥ sets, plus a `Back to workout` link (`h-11`)

## Summary Page

`app/(app)/workout/[sessionId]/page.tsx`: when the session has a plan, show its title and focus Badge under `Workout complete`.

## Scope Limits

- no editing of a started plan (generate a new one instead)
- no chat or streaming
- the daily limit and the AI rules stay as in spec 14

## Check When Done

- Generate with Auto returns a plan in under ~20 s that uses only catalog exercises; its focus is the push/pull/legs pattern trained longest ago
- Push, Pull, Legs, Upper and Full body each return matching exercises (no Leg Press on Upper)
- airplane mode (DevTools offline) → an error, and Generate works again once back online
- with 10 `PlanGeneration` rows from the last 24 h (insert them in `npx prisma studio`), Generate shows the daily-limit error and OpenAI isn't called
- Start → the banner appears with 0 sets → `/workout` shows the checklist → logging sets updates `{done} / {sets}` and the check marks → Finish → the summary shows the plan title
- Start while a manual workout is running attaches the plan: still one session
- a plan with an unknown `exerciseId` sent to `startWorkout` (e.g. from DevTools) is rejected
- the stored plan survives a reload and shows on another device
- (phone) a full generated workout played on the phone, from Generate to the summary
- `npm test`, `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
