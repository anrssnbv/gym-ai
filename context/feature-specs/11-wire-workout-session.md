Make workout sessions visible: the active-workout banner, the Workout tab for the current session, Finish workout, and a summary page for any finished workout. Uses `getActiveSession` and `finishWorkout` from spec 09. No AI plan yet (spec 15).

## Game Rules

Extend `lib/game.ts`:

- `summarizeSets(sets: { weightKg: number; reps: number; leveledUp: boolean }[])` → `{ setCount, volumeKg, levelUps }`
- `formatDuration(ms)` → `0 min`, `45 min`, `1 h 5 min` (minutes rounded down)
- `formatVolume(kg)` → below 1000: same as `formatKg` (`850 kg`); from 1000: tonnes with one decimal (`12.4 t`)

Extend `lib/game.test.ts` with cases for all three, including 59 min 59 s → `59 min` and 999.99 kg → `999.99 kg`.

## Query

Extend `lib/queries.ts`:

- `getSessionDetail(userId, sessionId)` → `{ id, startedAt, endedAt, sets }` for a session owned by the user, with `sets` oldest first (`{ id, exerciseId, weightKg, reps, level, leveledUp, createdAt }`), or `null`

## Elapsed Time

Add `ElapsedTime({ since })` to `components/local-time.tsx`: `formatDuration(Date.now() − since)`, refreshed every 30 s, rendered only on the client (same hydration rule as `LocalTime`).

## Active-Workout Banner

Create `components/workout/active-workout-banner.tsx` (client; uses `usePathname`):

- `app/(app)/layout.tsx` gets the user with `requireUserId()` (keep `auth.protect()` first) and passes `getActiveSession(userId)` to the banner
- rendered as the first element inside `<main>`, only when there is an active session, and hidden on `/workout` and `/workout/*`
- one full-width link to `/workout` (`rounded-2xl border border-brand/30 bg-brand-dim`, at least 44 px high): a small pulsing lime dot (`motion-safe:animate-pulse`), `Workout in progress`, `ElapsedTime`, `· {n} sets`, and a `ChevronRight` icon

Because every action revalidates the layout, the banner appears right after the first logged set. Pass `lastActivityAt` as an ISO string too. Recheck `isSessionStale` every 30 seconds and on `visibilitychange`; hide a stale banner without waiting for another write, and refresh the route once at expiry to obtain current server state. Exactly 3 hours remains active. Clean up listeners/timers.

## Session Sets

Create `components/workout/session-sets.tsx` (no hooks):

- groups sets by exercise, in the order each exercise was first logged
- per exercise: its name linking to its exercise page, then each set as `{formatKg(weight)} × {reps}`, with a `LV ↑` Badge on level-ups
- used by both pages below

## Workout Page

`app/(app)/workout/page.tsx`:

- no active session: keep the empty state and add a `Browse exercises` button linking to `/exercises`
- active session:
  - title `Workout`, `Started ` + `LocalTime` (hour and minute), `ElapsedTime`
  - totals line from `summarizeSets`: `{sets} sets · {formatVolume} · {levelUps} levels cleared`
  - `SessionSets`
  - `Finish workout` full-width primary button at the bottom (client component): calls `callAction(() => finishWorkout())` in a transition, shows `Finishing…`, then navigates to `/workout/{sessionId}` (a `null` id means nothing was open, so it just refreshes); an error shows in `text-danger`

## Summary Page

Create `app/(app)/workout/[sessionId]/page.tsx`:

- `getSessionDetail`; missing or another user's session → `notFound()`
- if it is the current active session → `redirect('/workout')`
- last activity = newest set time, or `startedAt` for zero sets; end time = `sessionEndAt(endedAt, lastActivityAt, now)`. A stale zero-set session ends at `startedAt` (zero duration); explicitly finishing a non-stale zero-set session ends at `now`. Such sessions may have a summary but never count in dashboard workout/time stats
- title `Workout complete`, `LocalTime` date, then stat tiles: duration (`formatDuration`), sets, volume (`formatVolume`), levels cleared
- `SessionSets`, and a `Back to Home` link

## Scope Limits

- no dashboard (spec 12), no AI plan (spec 15)
- no editing or deleting sets here (Undo lives on the exercise screen)
- no list of past workouts (the dashboard shows recent ones)

## Check When Done

- `npm test` passes
- after the first logged set, the banner shows on Home and Exercises (not on Workout) and opens `/workout`
- `/workout` groups the sets by exercise with correct totals
- Finish → the summary shows duration, sets, volume and levels cleared; the banner disappears; the next logged set starts a new session
- a session whose newest set is more than 3 h old (edit `createdAt` in `npx prisma studio`) is no longer active: no banner, empty `/workout`. The next logged set closes it at its last set's time and starts a new session.
- a mounted banner disappears after the idle limit without another action; zero-set stale and explicitly finished summaries have finite, defined durations
- an offline Finish shows an inline error, clears pending, and preserves the session for retry
- `/workout/{another user's session id}` returns 404
- times and elapsed time show in the browser's timezone
- no horizontal scroll at 360 px; `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated
