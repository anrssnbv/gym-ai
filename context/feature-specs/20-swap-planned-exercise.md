# 20 — Swap an exercise in an active workout

Let a user replace an unstarted exercise when a station is unavailable or the movement does not suit them. Keep the rest of the generated plan, its set count, and its completed history. This is a current-session edit, not another AI generation or a permanent preference.

## Active plan and replacement rules

- Add `Swap exercise` to each unfinished row on `/workout`. A row with any saved set for its exercise in the current session cannot be swapped; a finished row is also locked. Do not delete or reassign logged sets.
- Show alternatives from the existing catalog with the same `groupId` and `pattern`, permitted by the user's current equipment preferences. Exclude the current exercise and IDs already in the plan. Show the replacement's name, equipment, and movement guide link.
- Keep the original row position and planned set count. Offer only alternatives whose `exerciseTiming` work-and-rest minutes per set are no greater than the original. This preserves the plan's time ceiling without adding a duration field to existing sessions.
- Recheck `hasPlanCoverage` and `workoutPlanSchema` on the resulting plan. If no valid alternative exists, say so and keep the plan unchanged. A change to preferences after workout start must not invalidate already logged work or the original plan; it only controls available replacements.
- Replace the old AI cue with `See the movement guide for technique.` so an exercise-specific instruction never refers to the wrong movement. Keep the plan title, focus, summary, and other rows as they were.

## Data and action

- Reuse `WorkoutSession.plan` JSON and the current `workoutProgress` behavior. No new table, provider call, or generation quota charge.
- Add a server action in `actions/workout.ts` accepting `{ sessionId, stepIndex, expectedExerciseId, replacementId }` (untrusted input). Require the signed-in user. In one `serializableTransaction`, load the user's live session and plan, validate both catalog IDs and the rules above, check that the original exercise has no sets in that session, then update only the plan JSON.
- Treat an identical retry after a successful replacement as success when the requested replacement is already at `stepIndex`. If another tab changed the row or the session ended, return a stale-plan error and refresh; never overwrite that change.
- Revalidate the workout and exercise views after success. Existing set history, level progression, Undo, Finish, and summary remain tied to the actual logged exercise IDs.

## Mobile interaction

- Use the existing sheet and button components. Show the current exercise and set count above a scrollable alternative list; confirmation names both exercises. Keep controls above the numeric keyboard and safe area at 360 px width.
- While saving, disable repeat taps. On network failure, preserve the open selection and offer Retry. After confirmed success, close the sheet and show the replacement in the same workout row.
- The sheet has a labelled heading, keyboard focus on open and return on close, visible focus rings, and a text message when no alternatives exist.

## Dependencies

- Reuse `lib/catalog.ts`, `lib/plan.ts`, `lib/plan-schema.ts`, `lib/queries.ts`, `lib/workout-progress.ts`, existing Prisma transaction helper, and installed UI components.
- No new package, environment variable, migration, or AI request.

## Scope Limits

- No swaps in a preview or completed workout, mid-exercise transfer of logged sets, user-defined exercises, plan-wide regeneration, or automatic future preferences.
- This does not promise that same-muscle exercises are medically interchangeable; users choose from the offered alternatives.

## Check When Done

- Swap an unstarted exercise in a live full-body plan; row order, set count, completion total, and estimated time do not increase. Reload and a second device show the same replacement.
- Reject a replacement already in the plan, outside the muscle group/pattern, unavailable in preferences, or slower than the original. Show a useful empty state when no replacement qualifies.
- A logged exercise, finished session, another user's session, and a concurrent stale edit cannot change the plan. Saved sets and summary remain intact after a valid swap.
- Verify signed-out rejection, keyboard and 360 px interaction, failed-request retry, `npm test`, `npm run lint`, and `npm run build`; update `context/progress-tracker.md` after implementation.
