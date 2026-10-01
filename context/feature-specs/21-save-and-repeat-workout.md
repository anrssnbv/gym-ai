# 21 — Save and repeat a workout

Let a user save a completed generated workout as a reusable plan and start it again without another AI call. Repeating starts a new session; it never reuses logged sets, levels, or elapsed time from the original.

## Saved plan

- Add a `SavedWorkout` Prisma model with `id`, `userId`, `sourceSessionId`, `plan Json`, and `createdAt`. Make `(userId, sourceSessionId)` unique so a lost response or double tap cannot create duplicate saves. Add an index for the user's newest saved plans. Add nullable unique `repeatRequestId` to `WorkoutSession` for idempotent starts. This is an additive migration; existing sessions and plans stay unchanged.
- Save from a completed workout summary only when its owned session has a valid generated plan. Save the final plan, including any spec 20 swaps. Use its title as the displayed name; no rename editor in this release.
- The Workout tab lists the user's saved plans with title, focus, exercise count, set count, and `estimatePlanMinutes`. Show an empty state when none are saved. Each plan has `Start again` and `Remove` actions. Removing a saved plan does not change either the source session or later workouts.
- A saved plan is a snapshot. Repeating or changing training preferences does not edit the snapshot. If an exercise becomes unavailable under current preferences, explain which one and leave the saved plan available for later use.

## Actions and session behavior

- Add authenticated save, start, and remove actions in `actions/workout.ts`; each reads or writes rows scoped to `userId`. The browser sends a source or saved-plan ID and, for Start, a stable `requestId`; it never sends an authoritative plan body.
- Save validates the source session is ended and its `WorkoutSession.plan` passes `workoutPlanSchema`; return the existing save on an identical retry. A manual workout with no plan has no Save button.
- Start loads the saved plan on the server and validates its schema, current equipment, focus/coverage, and existing `isValidPlanSelection` against at least one supported `DURATIONS_MIN` value. This avoids requiring a duration field absent from older session records. Show the plan's calculated estimate before starting; do not promise a specific 60/90/120 minute target for a saved snapshot.
- Start receives a browser-generated `requestId` kept unchanged on Retry, loads the saved plan on the server, and creates a new `WorkoutSession` with that plan and `repeatRequestId` only when there is no active session. If the same request already created an owned session, return its ID without creating another, even if that session has since ended. If another workout is active, show `Finish your current workout before starting this saved plan.` Reuse the project's stale-session closing behavior and transaction helper; an unrelated active session is never overwritten.
- Repeat does not create a `PlanGeneration` row, consume the ten-plan daily quota, call OpenAI, copy set logs, or alter exercise calibration. Existing progress and summary calculations run against newly logged sets only.

## UI and failure states

- On a completed generated summary, `Save workout` changes to `Saved` after confirmation. If saving fails, retain the button and show an inline Retry error.
- On `/workout`, put saved plans below the active workout or empty-workout actions. Ask for confirmation before removal. Keep buttons at least 44 px, keyboard reachable, and readable at 360 px.
- After successful Start, navigate to the new `/workout` checklist at `0 / N` sets. If validation fails because equipment or catalog availability changed, preserve the saved plan and show the reason.

## Dependencies

- Reuse `WorkoutPlan`, `workoutPlanSchema`, `isValidPlanSelection`, `estimatePlanMinutes`, `findOpenSession`, and existing session and transaction patterns.
- One additive Prisma migration. No new package, provider call, or environment variable.

## Scope Limits

- No weekly schedule, routine editor, manual-workout conversion, public sharing, template folders, or personalized progression rules. Spec 20's active-session swaps do not change the saved snapshot.

## Check When Done

- Save an owned completed generated workout, reload, and start it twice on separate days; each new session begins with zero sets and leaves the source history intact. Saving the same summary again yields one saved row.
- A plan with an unavailable exercise stays listed but cannot start until preferences allow it. Malformed stored plans fail safely without deleting history.
- Reject signed-out access, another user's source/saved IDs, an active-session conflict, and a double-tap or lost-response Retry that would create a duplicate session.
- Verify empty and error states, keyboard and 360 px layout, migration preserves old records, `npm test`, `npm run lint`, and `npm run build`; update `context/progress-tracker.md` after implementation.
