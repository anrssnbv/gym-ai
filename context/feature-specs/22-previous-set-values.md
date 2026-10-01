# 22 — Previous workout values beside set logging

Show what the user lifted in their previous session for the current exercise before they start or log another set. The values are a reference, not an automatic weight or rep prescription; the existing level and calibration rules remain authoritative.

## Previous-session query

- Add `getPreviousExerciseSession(userId, exerciseId, currentSessionId)` to `lib/queries.ts`. Find the newest earlier session containing at least one set for this exercise, excluding the current active session, then return that session's sets for the exercise in logged order. Scope both queries to `userId`; use the existing `(userId, exerciseId, createdAt)` index.
- Include the session date and each set's `weightKg` and `reps`. A stale or finished prior session still counts. If there is no prior session, return `null`. Do not infer values from `ExerciseProgress`, which stores only current calibrated weight.
- Keep the result stable during the current workout even as new sets are saved. Reloading after Finish allows that finished session to become the previous session for the next workout.

## Exercise screen

- Load the reference on the exercise page with the existing owned state and history queries. In `components/exercise/exercise-level.tsx`, show a compact `Last workout` line beside the weight and Start/Log controls: date, then `weight × reps` for up to three sets and `+N more` when needed. The full prior session remains available in the existing set history below.
- If no earlier session exists, show `No previous workout for this exercise.` Do not prefill the rep sheet or automatically adjust working weight. Keep dumbbell `per dumbbell` wording consistent with the current screen.
- Ensure the reference stays visible while a round is running and before the rep sheet opens. It must not obscure the timer, primary action, keyboard, or movement guide on a 360 px screen.
- Use real text in a labelled region so screen readers receive the date, weights, reps, and empty state. No chart, animation, or new modal is needed.

## Dependencies

- Reuse `SetLog`, `getActiveSession`, `getRecentSets`, `formatKg`, and `LocalTime` patterns. No schema migration, package, external API, or new persistence.

## Scope Limits

- No suggested load, one-tap set confirmation, PR detection, comparison against body weight, or change to the game rule that levels up at twelve reps.

## Check When Done

- With two sessions for one exercise, show only the newest prior session's values in logged order. New sets in the current session do not replace the reference; a new session after Finish uses the just-finished one.
- Show the correct empty state for a new exercise. Do not mix sets from another exercise or account, and do not exceed three visible set values without the `+N more` label.
- Verify keyboard, screen reader text, 360 px layout, unchanged calibration/log/Undo behavior, `npm test`, `npm run lint`, and `npm run build`; update `context/progress-tracker.md` after implementation.
