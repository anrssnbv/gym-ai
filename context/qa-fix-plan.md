# QA fix plan

Date: 2026-09-25. Source: [current-issues.md](current-issues.md).

Status: implemented and verified on `fix/qa-training-integrity`. This plan covers the five confirmed defects, two validation gaps, three observations, and terminal warnings in the QA report. See [current-issues.md](current-issues.md) for results and remaining manual checks. The plan below records the chosen approach.

## Assessment

The five confirmed findings agree with the current source. QA-01 and QA-02 can damage training records and take priority. QA-03 is a conflict between two specified rules. QA-04 and QA-05 are local UI fixes. GAP-01 and GAP-02 are genuine missing server validations, although ordinary UI testing did not produce invalid plans. The observations do not yet justify a framework upgrade, authentication rewrite, or CAPTCHA configuration change.

The existing transactions, action result type, round IDs, validation helpers, and test suites are enough for the planned fixes. No dependency or database schema change is currently needed.

## 1. Protect set logging and Undo — QA-01, QA-02

### QA-01: Validate the round's attempted configuration

Change `logSet` to require `expectedWeightKg` and `expectedStepKg` alongside the existing `expectedLevel`. Send all three from the captured `round.state`, never from refreshed props. Validate and compare the normalized values with the progress row inside the existing serializable transaction, before session or set writes. Include the same values in the conditional level-up update.

If the configuration differs, return `stale: true` with copy that mentions exercise settings, not only level. Reuse the current stale-round handling: close the obsolete round, explain the conflict, refresh saved state, and require a new round. Never silently record the new weight against the old attempt.

Keep the existing replay lookup before this stale check: a previously committed round must still succeed after its own level-up or a later adjustment. Add the recorded weight to replay-payload matching. The stored set remains authoritative for an already committed attempt; a changed step on a replay must never recalculate progression.

**Why this design:** Comparing level, weight, and step fixes the observed wrong-load problem without a new revision column. A change followed by restoration to the exact same configuration does not alter the attempted load. Introduce a monotonic revision only if the product later requires invalidating rounds after every intervening edit.

**Files:** `actions/exercise.ts`, `components/exercise/exercise-level.tsx`, affected integration fixtures; specs 09–10.

**Acceptance:**

- Start at 20 kg, Adjust to 40 kg elsewhere, save: stale result, no new set/session/volume or progression.
- Changing only the step is also detected, including on a 12-rep attempt.
- Unchanged configuration saves normally; legitimate concurrent actions serialize without logging a different weight.
- Retrying a committed round creates no duplicate and causes no second level-up, even after a later adjustment.
- Invalid/missing snapshot fields fail validation; another user's data remains inaccessible.

### QA-02: Make Undo target one set and remain safe to retry

Change the action contract to `undoLastSet({ exerciseId, setId })`, using the displayed row's existing ID. Inside the existing serializable transaction:

1. Look up that exact ID scoped to the user and exercise.
2. If absent, return a harmless already-absent result and refreshed state. Do not look for a replacement set to delete or reveal whether another user owns the ID.
3. If present, verify it is still the newest set with the existing timestamp/ID ordering. Otherwise return a stale-history error and make no changes.
4. Delete only that row; apply its level rollback in the same transaction.

Return the acknowledged target ID with current state so the client can reconcile that specific round. Keep the target ID fixed through an uncertain response and its retry, even if a refresh updates the history list. Show a retry for the original operation; release that target after success or a definite stale-history conflict.

**Why this design:** Exact targeting plus a successful no-op for an absent target prevents the second deletion without an additional operation table. All mutation and latest-row checks remain transactional.

**Files:** `actions/exercise.ts`, `components/exercise/set-history.tsx`, affected integration tests; specs 09–10.

**Acceptance:**

- A newer set arrives in another tab: Undo from the old tab deletes neither row and explains the conflict.
- Undo commits, response is lost, retry: exactly one row is removed and one rollback occurs.
- Two concurrent Undo calls for the same ID have the same final database result as one.
- A later new set remains intact when an old Undo request is retried.
- Ordinary Undo, missing IDs, malformed input, exercise mismatch, and ownership checks remain safe.

## 2. Reconcile round feedback — QA-04

Handle this together with the Undo change. Give the existing exercise client component ownership of the history component's `onUndo(setId)` callback. Pass history data through the page; preserve the current visual layout. No global store or custom event bus is needed.

Track IDs of rounds successfully logged during this visit rather than only an anonymous counter. An acknowledged Undo removes its ID once. If it is the round currently showing a saved result, clear that result/reward and return to Start round. Undo of an older round must preserve a different running round's deadline and unsaved reps. Derive subsequent numbering from the remaining local completed rounds.

**Files:** `components/exercise/exercise-level.tsx`, `components/exercise/set-history.tsx`, exercise page; spec 10.

**Acceptance:** Undo a level-up and a normal result: feedback, count, saved card, history, and workout totals agree. Repeated acknowledgements do not decrement twice. Undo an older saved set while a newer round is running: the running timer and reps survive. Avoid remounting the entire screen on every refresh.

## 3. Enforce an individual weight limit for every exercise — QA-03

**User decision:** Replace the universal ceiling with realistic limits appropriate to each exercise. The initial 50-entry proposal and weight conventions are in [exercise-weight-limits.md](exercise-weight-limits.md). Examples: Barbell Bench Press 200 kg; Barbell Curl 80 kg; Incline Dumbbell Curl 30 kg per dumbbell; Back Squat 250 kg; Leg Press 600 kg. These are app progression ceilings, not prescribed working weights or universal human maxima.

Add a required `maxWeightKg` value to each catalog exercise. Use that one source for Calibrate/Adjust input bounds, action validation, and progression. Resolve the exercise on the server; never trust a maximum supplied by the client. Replace the global weight maximum rather than keeping two competing ceilings. Retain the shared minimum and existing step rules.

Keep game functions pure by passing the catalog maximum into `applySet(state, reps, maxWeightKg)`. If the next full increment would exceed the exercise's maximum, save the performed set but keep level and weight unchanged and return an explicit limit outcome. An increment landing exactly on the maximum is allowed. At the maximum, continued logging is allowed without more level-ups. Below it, offer Adjust so a smaller step can be chosen. Show the applicable limit and units; do not silently clamp a step or show a false level-up reward.

A replay must preserve the original limit outcome using the saved reps/level-up flag under this rule, rather than a later current weight. Inspect existing progress before rollout because these lower limits may affect real records. Preserve old weights/history/volume. Allow logging and unchanged-weight step edits for an existing above-limit value; prohibit increases and remove the exception once the user adjusts within the limit. Snapshot validation in QA-01 must accept those legitimate existing values while still requiring an exact match.

**Files:** `lib/catalog.ts`, `lib/game.ts`, `actions/exercise.ts`, weight sheet and exercise feedback controls, catalog/game/action tests; specs 03/05–06/09–10. No database column is needed for static catalog limits.

**Acceptance:** Every catalog ID has one finite positive limit; per-dumbbell units are consistent; calibration/Adjust/server validation agree. Test Bench Press reaching 200 exactly and attempting to cross it, Barbell Curl crossing 80, and Leg Press reaching 600. Cover 11/12/over-12 reps, smaller steps, at-limit saves, lost-response retry, Undo, and grandfathered existing weights. Stored set totals remain correct; the app never creates new above-limit progress.

## 4. Fix the tap target — QA-05

Add `inline-flex min-h-11 items-center` to the header link, retaining its existing typography and header geometry.

**File:** `components/app-shell/top-bar.tsx`.

**Acceptance:** Playwright bounding box is at least 44 px high; keyboard focus and navigation still work; no layout shift or overflow at 320/360 px. No new unit test is needed for this CSS-only fix.

## 5. Validate plans at their boundaries — GAP-01, GAP-02

### Duration

Calculate `sum(sets × roundSeconds(compound) / 60) + max(0, exerciseCount - 1)` using the catalog. After existing deduplication, reject a generated plan exceeding the requested duration with the current inline generation error. Use one small helper in `lib/plan.ts`. Do not silently trim the model's plan or add automatic paid retries.

Duration is currently a generation input, not part of stored `WorkoutPlan`. This fix guarantees that generated previews fit their request. No new duration column is required for that scope.

### Uniqueness and focus

Add application-side refinements to `workoutPlanSchema`: unique exercise IDs and each exercise's pattern allowed by its declared focus. Reuse `FOCUS_PATTERNS`/`candidateExercises`. This protects `startWorkout` and existing stored-plan parsing. Keep the provider's structured-output schema separate from these local refinements.

Leave calibration-count rules in generation, where the history context exists. A later calibration should not invalidate an otherwise valid stored plan. Existing invalid stored JSON should continue to use the manual-workout fallback, preserving its sets and summary access.

**Files:** `lib/plan.ts`, `lib/plan-schema.ts`, `actions/workout.ts`, planning/generation/planned-workout tests; specs 14–15.

**Acceptance:**

- A 32-minute plan is rejected for 30 minutes; exact-fit and shorter plans pass.
- Duplicate IDs and a Push exercise labeled Pull fail Start before creating or changing a session.
- Mixed compound/isolation timing, all focus choices including core, and deduplication are covered.
- Invalid stored plans fall back safely; normal generation, quota, manual-session attachment, and completion still work.
- Use mocked model outputs for regression tests; one live smoke call only if integration changes warrant it.

## 6. Investigate before choosing fixes — OBS-01/02/03

### OBS-01: Transport crash

Use a fresh disposable account/context and a single controlled failure per test. Test an offline request, an error response, and response loss after commit. Avoid overlapping route/dialog handlers. Capture browser errors, response status, and server logs. Repeat a reproduced failure against `next build` / `next start` to separate development transport behavior from production behavior.

Pass condition: inline error, retained reps/deadline, safe retry, no error boundary. If only the faulty harness reproduces the crash, document that and close the observation. Choose a framework/dependency fix only after identifying a reproducible version-specific failure and checking official documentation.

### OBS-02: Offline authentication recovery

Sign in independently through the UI; do not clone another context's session. Start a round, go offline long enough to exercise session refresh, then reconnect and save. Capture the Clerk refresh response, action redirect, current route, and whether the action reached a database write. Repeat with a genuinely expired/revoked session and against production mode if needed.

The current `requireUserId` redirects unauthenticated calls before writes. Determine whether a transient refresh failure is being mistaken for a logged-out state. If confirmed, keep page access redirects, but give action callers a recoverable authentication result and preserve the pending round while valid authentication is restored. Never weaken the authorization check or insert a set without a verified user. If a genuine sign-in redirect loses its destination, preserve that destination using the supported installed APIs. An offline queue or timer persistence across navigation is outside this fix and conflicts with the current round scope.

Pass condition: no redirect loop or silent loss of a pending round on transient recovery; truly unauthenticated actions write nothing and present an intentional sign-in path. Do not modify Clerk settings based only on the existing ambiguous log.

### OBS-03: Sign-up challenge

Complete sign-up manually in a normal browser, then check Home redirect and profile sign-out. A human must handle any live CAPTCHA. For automated tests, use Clerk's officially supported testing facilities on the development instance after checking its installed-version documentation. Do not disable bot protection globally. If a normal user also sees a stuck card, capture provider/network evidence and fix that demonstrated failure.

## 7. Handle warnings separately

- **Node module warning:** Low priority. Inspect the current TS/test module setup before choosing an explicit module configuration. Do not change the whole package to ESM solely to silence it. Verify test scripts, Prisma configuration, lint, and build if changed.
- **PostgreSQL TLS warning:** Before a driver upgrade, verify the intended certificate validation and document/configure it explicitly. Confirm connectivity with the intended TLS policy; do not print connection strings or change credentials as part of UI fixes.
- **Clerk development keys:** Expected locally. Production-key setup belongs to the deferred deployment work.
- **DevTools/offline notices:** No fix required when expected. Harness selector/handler failures belong in test cleanup.

## Delivery and verification

1. Update the affected spec contracts alongside implementation, so the original expected-level-only and exercise-only Undo instructions do not reintroduce the bugs.
2. Implement data integrity and Undo UI fixes first; then the selected weight rule, target size, and plan validation. Keep conditional investigations separate from proven fixes.
3. Extend the existing focused game, action, generation, and planned-workout tests. First demonstrate the new regression cases against the old behavior, then verify the corrected result.
4. Run `npm test`, `npm run test:integration`, `npm run lint`, `npm run build`, and `git diff --check`. No migration is expected under the recommended design.
5. Use Playwright MCP for two-tab edits, lost-response Undo/log retries, boundary feedback, target measurement, and one complete manual/generated flow. Recheck affected desktop/mobile views; no claim of physical-device verification.
6. Update each issue with fix location and evidence only after its checks pass. Record unresolved observations honestly and remove disposable accounts/data.
7. When implementation is requested and verified, follow the standing delivery workflow: push a fix branch, open the PR, merge after checks, and update local main/development as applicable. Preserve the existing unrelated review-file deletion.

Stop condition: each confirmed defect has a passing reproduction/regression check; both plan validations have deterministic tests; each observation has either a verified fix, a harness explanation, or a clearly recorded remaining reproduction requirement. Planning alone does not mark any issue fixed.
