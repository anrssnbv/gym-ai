Add the server side of the core loop: the user helper, the action result type, the read queries, the session rules, and the Server Actions for calibrate, adjust, log set, undo and finish workout. Backend only. The exercise screen keeps its local state until spec 10 wires it; the workout screen comes in spec 11.

## Dependencies

- Install: `npm i zod` (v4)
- Already installed: Prisma 7 client (`@/lib/generated/prisma/client`), `lib/prisma.ts`, Clerk

## User Helper

Create `lib/auth.ts`:

- `requireUserId(): Promise<string>` — `const { userId } = await auth()` (from `@clerk/nextjs/server`); if there is none, `redirect('/sign-in')`
- every query caller and every action gets the user only through this helper

## Action Result

Create `lib/action-result.ts` (no server imports, so client components can use it):

- `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; stale?: boolean }`. Every action declares its return type as `Promise<ActionResult<…>>`; without it TypeScript widens `ok` to `boolean` and `if (res.ok)` stops narrowing.
- `callAction<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>>` — awaits `run()` inside `try/catch`. A thrown error (offline, server crash) becomes `{ ok: false, error: "Couldn't reach the server. Try again." }`. Every client call from spec 10 on goes through it, so a failed request never reaches an error boundary.

## Game Rules

Extend `lib/game.ts` (still pure, no runtime imports):

- `SESSION_IDLE_MS = 3 * 60 * 60 * 1000`
- `isSessionStale(lastActivityAt: Date, now: Date): boolean` — true when `now − lastActivityAt > SESSION_IDLE_MS` (exactly 3 h is not stale)
- `sessionEnd(lastActivityAt: Date, now: Date): Date` — `lastActivityAt` when stale, otherwise `now`
- `sessionEndAt(endedAt: Date | null, lastActivityAt: Date, now: Date): Date` — `endedAt ?? sessionEnd(lastActivityAt, now)`. Every read that needs a session's end uses this (specs 11 and 12).
- `powerLevel(levels: number[]): number` — sum of (level − 1)

A session's **last activity** is always its newest set's `createdAt`, or `startedAt` when it has no sets (after Undo, or a started plan in spec 15).

Extend `lib/game.test.ts`:

- 3 h exactly is not stale; 3 h + 1 ms is
- `sessionEnd` returns the last activity when stale and `now` otherwise
- `sessionEndAt` prefers `endedAt` when set
- `powerLevel([])` = 0, `powerLevel([1, 1])` = 0, `powerLevel([3, 1, 5])` = 6

## Queries

Create `lib/queries.ts`. Every function takes `userId` and puts it in every Prisma `where`, including nested relation reads/counts. Raw SQL uses a parameterized user ID predicate.

- `findOpenSession(db, userId, now)` — `db` is `prisma` or a transaction client. Returns the latest session with `endedAt = null` as `{ id, startedAt, lastActivityAt, setCount, stale }`, or `null`. This is the one place that computes last activity and staleness; `getActiveSession`, `logSet`, `finishWorkout` and spec 15's `startWorkout` all use it.
- `getActiveSession(userId, now = new Date())` — `findOpenSession(prisma, …)`, with `null` when there is none or it's stale. Reads never write; a stale session is closed by the next write.
- `getLevelState(userId, exerciseId): Promise<LevelState | null>`
  - the `ExerciseProgress` row mapped to `LevelState`
  - `bestRepsAtLevel` follows Derived Values in `architecture.md`: max `reps` of this user's sets for the exercise where `level` = the row's level and `weightKg` = the row's weight (`setLog.aggregate` with `_max`), 0 if none
- `getProgressMap(userId): Promise<Record<string, { level: number; weightKg: number }>>` — every progress row keyed by `exerciseId` (a plain object, so pages can pass it to client components)
- `getRecentSets(userId, exerciseId, take = 10)` — newest first: `{ id, createdAt, weightKg, reps, level, leveledUp }`

## Server Actions

Create `actions/exercise.ts` and `actions/workout.ts`, each with `"use server"` at the top. Export only the actions: shared helpers live in `lib/`, because every export of a `"use server"` file becomes a public endpoint.

Rules for every action (see Server Actions in `code-standards.md`):

- first line: `const userId = await requireUserId()`
- actions with input parse the input object with a Zod schema; a failure returns `{ ok: false, error: 'Invalid input' }`
- when an action accepts `exerciseId`, it must exist in the catalog (`getExercise`), otherwise `{ ok: false, error: 'Unknown exercise' }`
- limits come from `lib/game.ts` and the catalog: finite weight ≥ `WEIGHT_MIN_KG`, step in `STEP_LIMITS_KG`, reps an integer in `REPS_LIMITS`, `expectedLevel` an integer ≥ 1. Normalize weights and expected steps with `roundKg` before comparisons. Calibration and changed Adjust weights must be ≤ `exercise.maxWeightKg`; the unchanged existing-weight exception is defined below.
- `userId` is in every `where`, including updates by `id`
- after every successful write, call `revalidatePath('/', 'layout')`. It re-renders the current page at once and clears the client cache; every page here is per-user and cheap to render.
- return an `ActionResult`; never throw for expected errors
- `adjustExercise`, `undoLastSet`, and session-mutating actions (`logSet`, `finishWorkout`, and spec 15’s `startWorkout`) use serializable transactions with at most 3 attempts on Prisma `P2034` conflicts. Prisma 7's pg adapter may expose commit-time conflicts as `DriverAdapterError` with `TransactionWriteConflict` and PostgreSQL code `40001` or `40P01`; retry those equivalent conflicts too. Re-run the whole transaction; never retry validation errors. Exhausted conflicts return a retryable `ActionResult` error. This prevents concurrent first sets/Start/Finish from creating contradictory open sessions and keeps configuration/Undo checks atomic; no schema change is needed. Keep retry helpers in `lib/`, not exported from action files.

### `actions/exercise.ts`

1. `calibrateExercise({ exerciseId, weightKg, stepKg })`
   - reject a rounded weight above `exercise.maxWeightKg` with an error naming that exercise's limit
   - `upsert` on `(userId, exerciseId)` with `create` from `calibrate(weightKg, stepKg)` (level 1, rounded values, `startWeightKg` = weight) and an empty `update`, so a double tap or a second device just returns the existing row
   - returns `getLevelState(...)`
2. `adjustExercise({ exerciseId, weightKg, stepKg })`
   - read the progress row by `userId` + `exerciseId` inside the serializable transaction; no row → `{ ok: false, error: 'Calibrate this exercise first' }`
   - reject a rounded weight above `exercise.maxWeightKg`, unless it is exactly the existing row's weight. This preserves step-only edits to legacy above-limit progress without permitting an increase or another above-limit value. An adjustment within the limit ends the exception; no existing history or volume is rewritten.
   - update that row by `id` + `userId`: `weightKg` and `stepKg` rounded with `roundKg`, never `level`
   - returns `getLevelState(...)`
3. `logSet({ setId, exerciseId, reps, expectedLevel, expectedWeightKg, expectedStepKg })` — `setId` is a random string (16–64 chars) the client creates once per round. The three expected fields are required and capture the attempted configuration. Weight must be finite and at least `WEIGHT_MIN_KG`; step must be within `STEP_LIMITS_KG`; normalize both with `roundKg`. Existing above-limit weights remain valid snapshots. Everything runs inside one serializable transaction:
   1. look up `SetLog` with both `id: setId` and `userId`. If found, require its `exerciseId`, `reps`, attempted `level`, and recorded `weightKg` to match the request; otherwise return `Invalid input`. A matching row is a replay: return current level state plus the stored row's `leveledUp`, `sessionId`, and `limitReached = reps >= TARGET_REPS && !leveledUp`, without another write. This lookup precedes the configuration check, so a committed set can be retried after its own level-up or a later adjustment. Never recompute its progression using a changed step, and never read another user's row to identify a collision.
   2. load the progress row; none → `Calibrate this exercise first`
   3. if the row's level, weight, or step differs from the normalized expected values → `{ ok: false, error: 'Your exercise settings changed on another screen. Start a new round.', stale: true }`. Check before session/set writes; same-level weight or step changes must not silently alter the attempted round.
   4. `findOpenSession(tx, …)`: when stale, set its `endedAt` to its `lastActivityAt` and treat it as gone. If no usable session is left, create one.
   5. `applySet(rowState, reps, exercise.maxWeightKg)` decides `leveledUp`, `limitReached`, and the new level/weight. A blocked progression still saves the performed set at the actual weight and contributes to best reps and workout totals.
   6. insert the `SetLog` with `id: setId`, the attempted `level` and `weightKg` (the row's current values), `reps` and `leveledUp`
   7. on a level-up: `tx.exerciseProgress.updateMany({ where: { id: row.id, userId, level: expectedLevel, weightKg: expectedWeightKg, stepKg: expectedStepKg }, data: { level, weightKg } })`. If `count` is 0, throw to roll back and return the stale error from step 3.
   - if a concurrent request causes a unique-key conflict on `SetLog.id` or the stale-level guard fails, roll back first, then repeat the same scoped replay lookup outside the transaction. A matching saved attempt returns success; mismatched reuse returns `Invalid input`; no matching row returns the original stale error or generic `Invalid input` for the ID collision. Do not treat unrelated database errors as duplicates.
   - returns `{ state: LevelState, leveledUp: boolean, limitReached: boolean, sessionId: string }`, with `state` read after the transaction. A successful replay also revalidates the layout so a lost response does not leave the UI stale.
4. `undoLastSet({ exerciseId, setId })` — `setId` is the displayed row's ID (16–64 chars). Inside one serializable transaction:
   - look up exactly that ID scoped to `userId` and `exerciseId`; an absent target succeeds without deleting any replacement row or revealing whether another user owns the ID
   - if present, read this user's newest set for the exercise, ordered by `createdAt` descending then `id` descending. A different newest ID → `{ ok: false, error: 'Your history changed on another screen. Review the latest set before undoing.', stale: true }`, with no changes
   - delete only the target row; if it was a level-up, restore the progress row's `level` and `weightKg` from that set in the same transaction
   - after success (including an absent target), revalidate and return `{ setId, state: await getLevelState(...) }`, where `state` may be null. Retrying the same target cannot delete a newer set or apply a rollback twice.

### `actions/workout.ts`

5. `finishWorkout()`
   - `findOpenSession(tx, …)` inside the serializable transaction; none → `{ ok: true, data: { sessionId: null } }`
   - `endedAt = sessionEnd(lastActivityAt, now)`, so a stale session ends at its last activity, not now
   - returns `{ sessionId }`

## Scope Limits

- no UI changes (spec 10 and 11)
- no dashboard queries (spec 12), no AI (spec 14)
- no API routes, no stored derived numbers
- don't change the Prisma schema (`setId` uses the existing string `SetLog.id`)

## Check When Done

- `npm test` passes, including the new session and power-level tests
- every exported action starts with `requireUserId()` and input-bearing actions use a Zod parse, declares `Promise<ActionResult<…>>`, and every Prisma `where` includes `userId`
- `callAction` has a small test proving success/error results are preserved and a rejected promise becomes the retryable error.
- replaying a set ID with the same payload creates one set and at most one level-up; mismatched payloads are rejected; simultaneous retries recover after rollback.
- a weight-only or step-only adjustment in another tab makes an uncommitted snapshot stale before any set/session write; missing snapshot fields fail validation. A committed replay still succeeds after a later adjustment, but mismatched recorded weight is rejected.
- Undo of an older displayed row rejects without deleting either set; an absent target, duplicate concurrent Undo, and a lost-response retry remove at most the exact requested row and roll back at most once. Later new sets and other users' data remain intact.
- calibration and changed Adjust values use the catalog ceiling; an unchanged existing above-limit weight remains editable and loggable. A capped successful set has `limitReached: true`, no level-up, and preserved level/weight; an exact-limit next step advances normally.
- two concurrent first sets/start requests create one active session, and Finish racing with a log has a serial order
- the `"use server"` files export nothing but actions
- `npm run lint` and `npm run build` pass
- `progress-tracker.md` updated. The end-to-end behavior is checked through the UI in spec 10.
