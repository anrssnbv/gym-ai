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
- pass the state to `ExerciseLevel` as a prop, and render the set history below it

## ExerciseLevel

`components/exercise/exercise-level.tsx`:

- replace the local `useState<LevelState | null>` with a `state: LevelState | null` prop. Every action revalidates the page (spec 09), so the prop is always the saved state.
- keep only UI state: the current round, the level-up overlay, rounds logged, pending
- run every action through `callAction(() => action(input))` inside `useTransition`; disable `Start round`, `Adjust` and `Calibrate` while pending
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
- `ExerciseLevel` calls `callAction(() => logSet({ setId: round.setId, exerciseId, reps, expectedLevel: round.state.level }))`:
  - success → the same result line as spec 06 ("So close — 11 / 12" …) and, when `leveledUp`, the level-up overlay with the returned state
  - `!res.ok && res.stale` → close the reps sheet, end the obsolete round, retain/show the error next to the action row, and call `router.refresh()`. The user can then start a fresh round from the new saved level; do not retry the obsolete round

## Set History

Create `components/exercise/set-history.tsx` and render it under the level card when the exercise has sets:

- heading `History`; up to 10 rows, newest first: `LocalTime` (month, day, hour, minute), `{formatKg(weight)} × {reps}`, and a `LV ↑` Badge (`text-level`) on level-ups
- the newest row has an `Undo` button (client, `h-11`):
  - asks `window.confirm('Undo this set? If it leveled you up, the level goes back too.')`
  - then calls `callAction(() => undoLastSet({ exerciseId }))` in a transition; disabled while pending; an error shows in `text-danger` next to it
- nothing is rendered when there are no sets

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
- double-tapping Save logs one set. Two tabs on the same exercise: after tab A levels up, tab B's save shows the "level changed" error and refreshes to the new level.
- Undo after a level-up restores the previous level and weight; Undo on a normal set only removes that row
- Adjust persists and keeps the level; best reps reset only when the weight changed
- with the network offline (DevTools), calibrate, adjust, log, and Undo show inline errors and can retry; the timer and page remain mounted. Simulate a committed log whose response is lost: retrying the same ID/payload returns success without another set or level-up
- a second account sees none of the first account's progress
- level badges and group power match the data in `npx prisma studio`
- history times show in the browser's timezone
- `npm test`, `npm run lint` and `npm run build` pass
- (phone) a round logged on the phone shows up on the desktop after a reload
- `progress-tracker.md` updated
