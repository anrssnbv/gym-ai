Wire the exercise screen and the catalog to real data from spec 09. The level state now comes from the database through the page, and the client keeps only UI state. This adds the set history with Undo, level badges on the exercise list, and group power on the groups grid.

## Local Time

Create `components/local-time.tsx` (client):

- `LocalTime({ date, options })` — `date` is an ISO string; renders `<time dateTime={date}>` with the text formatted by `Intl.DateTimeFormat(undefined, options)` in the browser's timezone
- render the text only on the client (e.g. `useSyncExternalStore` with an empty server snapshot), so the server (UTC) and the browser never disagree during hydration
- specs 11 and 12 reuse it

## Exercise Page

`app/(app)/exercises/[groupId]/[exerciseId]/page.tsx`:

- `const userId = await requireUserId()`
- load in parallel: `getLevelState(userId, exercise.id)` and `getRecentSets(userId, exercise.id, 10)`
- pass `state` and the recent sets (dates serialized to ISO strings) to `ExerciseLevel`; it renders the set history directly below the level card and owns reconciliation after Undo

## ExerciseLevel

`components/exercise/exercise-level.tsx`:

- replace the local `useState<LevelState | null>` with a `state: LevelState | null` prop. Every action revalidates the page (spec 09), so the prop is always the saved state.
- keep only UI state: the current round, the level-up overlay, successfully logged set IDs for this visit, pending, and errors. Count completed rounds from those IDs; add/remove each ID at most once.
- run every action through `callAction(() => action(input))` inside `useTransition`; disable `Start round`, `Adjust`, `Calibrate`, and round mutation controls while a save or Undo is pending. Disable Undo during another exercise save; do not remount the screen on a refresh.
- rounds keep capturing the state they started with (`round.state`), as now. Create `setId = crypto.randomUUID()` once in the Start/Next round event handler; keep it and the submitted reps unchanged for a retry after an uncertain response. A fresh round gets a new ID.
- thrown network/server failures become inline errors through `callAction`; retain the running round, input values, and saved props. Clear pending/one-save guards in `finally`, without changing the round deadline. No action promise may escape to an error boundary.

### Weight Sheet

`components/exercise/weight-sheet.tsx`:

- `onSave` becomes `(weightKg: number, stepKg: number) => Promise<string | null>`: it resolves to an error message, or `null` on success. The sheet no longer calls `calibrate()` or `adjust()` itself; the server does.
- `ExerciseLevel` passes `calibrateExercise` or `adjustExercise` wrapped to that signature
- while waiting: the submit button shows `Saving…` and is disabled
- `null` → close; a message → show it in `text-danger` above the submit button and keep the values for a retry

### Log Reps Sheet

`components/exercise/log-reps-sheet.tsx`:

- `onSave` becomes `(reps: number) => Promise<string | null>`, same pattern as the weight sheet: `Saving…` while waiting, close on `null`, show the message and allow a retry otherwise. The one-save guard resets after an error.
- `ExerciseLevel` calls `callAction(() => logSet({ setId: round.setId, exerciseId, reps, expectedLevel: round.state.level, expectedWeightKg: round.state.weightKg, expectedStepKg: round.state.stepKg }))`. All expected values come from the captured round, never refreshed props:
  - success → add the round's set ID once, show the same result line as spec 06 ("So close — 11 / 12" …) and, when `leveledUp`, the level-up overlay with the returned state
  - `limitReached` → show spec 06's saved-set limit explanation and `Adjust weight or step`, with no reward; a successful adjustment clears the completed result and returns to Start round
  - `!res.ok && res.stale` → close the reps sheet, end the obsolete round, retain/show the exercise-settings error next to the action row, and call `router.refresh()`. The user can start a fresh round from the new saved configuration; do not retry the obsolete round

## Set History

Create `components/exercise/set-history.tsx` as a child of `ExerciseLevel`, under the level card:

- heading `History`; up to 10 rows, newest first: `LocalTime` (month, day, hour, minute), `{formatKg(weight)} × {reps}`, and a `LV ↑` Badge (`text-level`) on level-ups
- the newest row has an `Undo` button (client, `h-11`):
  - asks `window.confirm('Undo this set? If it leveled you up, the level goes back too.')`
  - capture that row's ID and call `callAction(() => undoLastSet({ exerciseId, setId }))` in a transition; disabled while pending; an error shows in `text-danger` next to it
  - retain that exact target after an uncertain failure, even if refreshed history no longer includes it. Show `Retry Undo` for the retained ID and disable starting a different Undo until it resolves. A retry does not ask for confirmation again.
  - success (including an already-absent target) clears the retry target and calls `onUndo(result.data.setId)`; a stale-history error clears the target and refreshes the history without deleting another row
- `ExerciseLevel` removes the acknowledged ID once from its completed IDs. If it matches the current round, clear that result and reward, returning to Start round. If it is an older completed set, preserve any different running round, deadline, and unsaved reps. Subsequent round numbers follow the remaining local completed IDs.
- render nothing only when there are no sets, retained retry target, or error; an uncertain Undo must remain retryable after the last row disappears from refreshed props

## Catalog Screens

- `/exercises/[groupId]`: load `getProgressMap(userId)`; each calibrated exercise card shows `LV {level}` (`font-display text-level`) and its current weight (`formatKg`) next to the name
- `/exercises`: each group card shows `Power {n}` in `text-level` when n > 0, where n = `powerLevel` of that group's calibrated exercises

## Scope Limits

- no workout screen and no active-workout banner (spec 11), no dashboard (spec 12)
- no optimistic updates: the UI waits for the server (one round trip per set)
- no offline queue

## Check When Done

- calibrate → reload → still calibrated; another browser signed in as the same user sees the same level
- log 10 → `Best at this level 10 / 12` survives a reload; log 12 → overlay, `LV 2`, new weight, and a history row with `LV ↑`
- double-tapping Save logs one set. Two tabs on the same exercise: after tab A levels up or adjusts only weight/step, tab B's captured attempt shows the exercise-settings error, writes no set, and refreshes to the new configuration.
- Undo after a level-up restores the previous level and weight; Undo on a normal set removes only that row. Both clear feedback for the acknowledged current result and reconcile the round count; Undo of an older round leaves a different running round and its input intact.
- when another tab logs a newer set, Undo from stale history deletes neither row. If Undo commits but its response is lost, `Retry Undo` keeps the original target through refresh and deletes nothing else, even after a later new set arrives.
- Adjust persists and keeps the level; best reps reset only when the weight changed
- exercise-specific limits appear with the correct units and match server validation. A capped successful set stays in history and totals without a reward; best reps above 12 have a capped accessible progress bar. Existing above-limit weights remain visible/loggable, permit step-only edits, and cannot increase.
- with the network offline (DevTools), calibrate, adjust, log, and Undo show inline errors and can retry; the timer and page remain mounted. Simulate a committed log whose response is lost: retrying the same ID/payload returns success without another set or level-up
- a second account sees none of the first account's progress
- level badges and group power match the data in `npx prisma studio`
- history times show in the browser's timezone
- `npm test`, `npm run lint` and `npm run build` pass
- (phone) a round logged on the phone shows up on the desktop after a reload
- `progress-tracker.md` updated
